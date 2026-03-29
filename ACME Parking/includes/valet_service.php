<?php

require_once __DIR__ . '/valet_queries.php';
require_once __DIR__ . '/valet_logic.php';

function get_valet_floor_number(PDO $pdo): int
{
    $floor = query_valet_floor($pdo);
    return $floor ? (int)$floor['floor_number'] : 1;
}

function get_open_valet_spaces(PDO $pdo): int
{
    return query_open_valet_spaces($pdo);
}

function get_other_floor_spaces(PDO $pdo): array
{
    return query_other_floor_spaces($pdo);
}

function get_active_car_wash_schedule(PDO $pdo): array
{
    return query_active_car_wash_schedule($pdo);
}

function create_valet_checkin(PDO $pdo, string $licensePlate, int $carWashRequested): array
{
    $licensePlate = validate_license_plate($licensePlate);

    $existingActiveSlip = query_active_slip_by_plate($pdo, $licensePlate);
    if ($existingActiveSlip) {
        throw new Exception('This vehicle is already checked in.');
    }

    if (get_open_valet_spaces($pdo) <= 0) {
        throw new Exception('No valet spaces are available on the valet floor.');
    }

    $washEligible = is_car_wash_eligible_now() ? 1 : 0;

    if ($carWashRequested === 1 && $washEligible === 0) {
        throw new Exception('Car wash cannot be scheduled before 8:00 AM or after 4:00 PM.');
    }

    $carWashFee = calculate_car_wash_fee($carWashRequested, $washEligible);

    $pdo->beginTransaction();

    try {
        $parkingLotId = query_valet_parking_lot_id($pdo);
        $slot = query_random_open_valet_slot($pdo);

        $parkingSlipId = insert_valet_slip(
            $pdo,
            $parkingLotId,
            (int)$slot['parking_slot_id'],
            $licensePlate,
            $carWashRequested,
            $carWashFee,
            $washEligible
        );

        mark_slot_occupied($pdo, (int)$slot['parking_slot_id']);

        $pdo->commit();

        return [
            'parking_slip_id' => $parkingSlipId,
            'license_plate' => $licensePlate,
            'floor_number' => $slot['floor_number'],
            'slot_label' => $slot['slot_label'],
            'car_wash_requested' => $carWashRequested,
            'wash_eligible' => $washEligible,
            'car_wash_fee' => $carWashFee
        ];
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}

function complete_valet_checkout(PDO $pdo, string $licensePlate): array
{
    $licensePlate = validate_license_plate($licensePlate);
    $slip = query_active_valet_slip_by_plate($pdo, $licensePlate);
    $totals = calculate_checkout_totals($slip);

    $pdo->beginTransaction();

    try {
        close_valet_slip(
            $pdo,
            (int)$slip['parking_slip_id'],
            $totals['exit_time'],
            $totals['total_due']
        );

        mark_slot_open($pdo, (int)$slip['parking_slot_id']);

        $pdo->commit();

        return [
            'parking_slip_id' => $slip['parking_slip_id'],
            'license_plate' => $slip['license_plate'],
            'floor_number' => $slip['floor_number'],
            'slot_label' => $slip['slot_label'],
            'entry_time' => $totals['entry_time'],
            'exit_time' => $totals['exit_time'],
            'minutes_parked' => $totals['minutes_parked'],
            'hours_to_charge' => $totals['hours_to_charge'],
            'parking_fee' => $totals['parking_fee'],
            'car_wash_requested' => (int)$slip['car_wash_requested'],
            'car_wash_fee' => $totals['car_wash_fee'],
            'total_due' => $totals['total_due']
        ];
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}