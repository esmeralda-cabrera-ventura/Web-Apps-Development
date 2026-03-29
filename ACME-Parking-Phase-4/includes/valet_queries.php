<?php

function query_valet_floor(PDO $pdo): ?array
{
    $stmt = $pdo->query("
        SELECT floor_id, floor_number
        FROM floor
        WHERE is_valet_only = 1
        LIMIT 1
    ");

    $row = $stmt->fetch();
    return $row ?: null;
}

function query_open_valet_spaces(PDO $pdo): int
{
    $stmt = $pdo->query("
        SELECT COUNT(*)
        FROM parkingslot ps
        INNER JOIN floor f ON ps.floor_id = f.floor_id
        WHERE f.is_valet_only = 1
          AND ps.is_active = 1
          AND ps.is_occupied = 0
    ");

    return (int)$stmt->fetchColumn();
}

function query_other_floor_spaces(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            f.floor_number,
            COUNT(*) AS total_slots,
            COALESCE(SUM(CASE WHEN ps.is_occupied = 0 THEN 1 ELSE 0 END), 0) AS open_spaces
        FROM floor f
        INNER JOIN parkingslot ps ON f.floor_id = ps.floor_id
        WHERE f.is_valet_only = 0
          AND ps.is_active = 1
        GROUP BY f.floor_id, f.floor_number
        ORDER BY f.floor_number
    ");

    return $stmt->fetchAll();
}

function query_valet_parking_lot_id(PDO $pdo): int
{
    $stmt = $pdo->query("
        SELECT pl.parking_lot_id
        FROM parkinglot pl
        INNER JOIN floor f ON pl.parking_lot_id = f.parking_lot_id
        WHERE f.is_valet_only = 1
        LIMIT 1
    ");

    $parkingLotId = $stmt->fetchColumn();

    if (!$parkingLotId) {
        throw new Exception('Parking lot not found.');
    }

    return (int)$parkingLotId;
}

function query_random_open_valet_slot(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT ps.parking_slot_id, ps.slot_label, f.floor_number
        FROM parkingslot ps
        INNER JOIN floor f ON ps.floor_id = f.floor_id
        WHERE f.is_valet_only = 1
          AND ps.is_active = 1
          AND ps.is_occupied = 0
        ORDER BY RAND()
        LIMIT 1
    ");

    $slot = $stmt->fetch();

    if (!$slot) {
        throw new Exception('No valet slot is available.');
    }

    return $slot;
}

function query_active_valet_slip_by_plate(PDO $pdo, string $licensePlate): array
{
    $stmt = $pdo->prepare("
        SELECT
            pslip.parking_slip_id,
            pslip.license_plate,
            pslip.entry_time,
            pslip.hourly_rate,
            pslip.car_wash_requested,
            pslip.car_wash_fee,
            pslip.wash_eligible,
            pslot.parking_slot_id,
            pslot.slot_label,
            f.floor_number
        FROM parkingslip pslip
        INNER JOIN parkingslot pslot ON pslip.parking_slot_id = pslot.parking_slot_id
        INNER JOIN floor f ON pslot.floor_id = f.floor_id
        WHERE pslip.license_plate = :license_plate
          AND pslip.status = 'ACTIVE'
          AND pslip.is_valet = 1
        LIMIT 1
    ");

    $stmt->execute([':license_plate' => $licensePlate]);
    $slip = $stmt->fetch();

    if (!$slip) {
        throw new Exception('No active valet slip found for that license plate.');
    }

    return $slip;
}

function query_active_car_wash_schedule(PDO $pdo): array
{
    $stmt = $pdo->query("
        SELECT
            pslip.parking_slip_id,
            pslip.license_plate,
            pslip.entry_time,
            pslip.car_wash_fee,
            pslip.wash_eligible,
            pslot.slot_label,
            f.floor_number
        FROM parkingslip pslip
        INNER JOIN parkingslot pslot ON pslip.parking_slot_id = pslot.parking_slot_id
        INNER JOIN floor f ON pslot.floor_id = f.floor_id
        WHERE pslip.status = 'ACTIVE'
          AND pslip.is_valet = 1
          AND pslip.car_wash_requested = 1
        ORDER BY pslip.entry_time ASC
    ");

    return $stmt->fetchAll();
}

function query_active_slip_by_plate(PDO $pdo, string $licensePlate): ?array
{
    $stmt = $pdo->prepare("
        SELECT parking_slip_id, license_plate, status, is_valet
        FROM parkingslip
        WHERE license_plate = :license_plate
          AND status = 'ACTIVE'
        LIMIT 1
    ");

    $stmt->execute([
        ':license_plate' => $licensePlate
    ]);

    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row ?: null;
}

function insert_valet_slip(
    PDO $pdo,
    int $parkingLotId,
    int $parkingSlotId,
    string $licensePlate,
    int $carWashRequested,
    float $carWashFee,
    int $washEligible
): int {
    $stmt = $pdo->prepare("
        INSERT INTO parkingslip (
            parking_lot_id,
            parking_slot_id,
            customer_id,
            license_plate,
            entry_time,
            hourly_rate,
            total_amount,
            status,
            is_valet,
            car_wash_requested,
            car_wash_fee,
            wash_eligible
        ) VALUES (
            :parking_lot_id,
            :parking_slot_id,
            NULL,
            :license_plate,
            CURRENT_TIMESTAMP,
            1.00,
            NULL,
            'ACTIVE',
            1,
            :car_wash_requested,
            :car_wash_fee,
            :wash_eligible
        )
    ");

    $stmt->execute([
        ':parking_lot_id' => $parkingLotId,
        ':parking_slot_id' => $parkingSlotId,
        ':license_plate' => $licensePlate,
        ':car_wash_requested' => $carWashRequested,
        ':car_wash_fee' => $carWashFee,
        ':wash_eligible' => $washEligible
    ]);

    return (int)$pdo->lastInsertId();
}

function mark_slot_occupied(PDO $pdo, int $parkingSlotId): void
{
    $stmt = $pdo->prepare("
        UPDATE parkingslot
        SET is_occupied = 1
        WHERE parking_slot_id = :parking_slot_id
    ");

    $stmt->execute([':parking_slot_id' => $parkingSlotId]);
}

function mark_slot_open(PDO $pdo, int $parkingSlotId): void
{
    $stmt = $pdo->prepare("
        UPDATE parkingslot
        SET is_occupied = 0
        WHERE parking_slot_id = :parking_slot_id
    ");

    $stmt->execute([':parking_slot_id' => $parkingSlotId]);
}

function close_valet_slip(PDO $pdo, int $parkingSlipId, string $exitTime, float $totalDue): void
{
    $stmt = $pdo->prepare("
        UPDATE parkingslip
        SET exit_time = :exit_time,
            total_amount = :total_amount,
            status = 'CLOSED'
        WHERE parking_slip_id = :parking_slip_id
    ");

    $stmt->execute([
        ':exit_time' => $exitTime,
        ':total_amount' => $totalDue,
        ':parking_slip_id' => $parkingSlipId
    ]);
}