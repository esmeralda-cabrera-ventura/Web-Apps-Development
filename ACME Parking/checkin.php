<?php
date_default_timezone_set('America/Los_Angeles');
require_once __DIR__ . '/includes/auth.php';
require_login();
require_once __DIR__ . '/includes/db.php';

$currentCategory = "parking";
$message = "";
$error = "";
$assignedSlip = null;

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $licensePlate = strtoupper(trim($_POST["license_plate"] ?? ""));
    $parkingLotId = 1;
    $hourlyRate = 1.00;
    $entryTime = date('Y-m-d H:i:s');

    if ($licensePlate === "") {
        $error = "License plate is required.";
    } else {
        $activeSlipStmt = $pdo->prepare("
            SELECT parking_slip_id
            FROM parkingslip
            WHERE license_plate = ?
              AND status = 'ACTIVE'
            LIMIT 1
        ");
        $activeSlipStmt->execute([$licensePlate]);
        $existingActiveSlip = $activeSlipStmt->fetch();

        if ($existingActiveSlip) {
            $error = "This vehicle is already checked in.";
        } else {
            $slotStmt = $pdo->query("
                SELECT s.parking_slot_id, s.slot_label, f.floor_number, f.name AS floor_name
                FROM parkingslot s
                JOIN floor f ON s.floor_id = f.floor_id
                LEFT JOIN parkingslip p
                  ON s.parking_slot_id = p.parking_slot_id
                  AND p.status = 'ACTIVE'
                WHERE s.is_active = 1
                  AND p.parking_slip_id IS NULL
                ORDER BY RAND()
                LIMIT 1
            ");

            $slot = $slotStmt->fetch();

            if (!$slot) {
                $error = "No open parking spaces are available.";
            } else {
                $insertStmt = $pdo->prepare("
                    INSERT INTO parkingslip (
                        parking_lot_id,
                        parking_slot_id,
                        customer_id,
                        license_plate,
                        entry_time,
                        hourly_rate,
                        status
                    )
                    VALUES (?, ?, NULL, ?, ?, ?, 'ACTIVE')
                ");

                $insertStmt->execute([
                    $parkingLotId,
                    $slot["parking_slot_id"],
                    $licensePlate,
                    $entryTime,
                    $hourlyRate
                ]);

                $slipId = $pdo->lastInsertId();

                $assignedSlip = [
                    "parking_slip_id" => $slipId,
                    "license_plate" => $licensePlate,
                    "floor_number" => $slot["floor_number"],
                    "floor_name" => $slot["floor_name"],
                    "slot_label" => $slot["slot_label"],
                    "hourly_rate" => number_format($hourlyRate, 2),
                    "entry_time" => $entryTime
                ];

                $message = "Parking slip issued successfully.";
            }
        }
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="layout">
  <?php require __DIR__ . '/includes/nav.php'; ?>

  <div class="main">
    <div class="card">
      <h2>Record Incoming Vehicle</h2>
      <p>The license plate is assumed to be captured by camera. The attendant issues the parking slip.</p>

      <?php if ($message): ?>
        <p style="color: green; font-weight: bold;"><?= htmlspecialchars($message) ?></p>
      <?php endif; ?>

      <?php if ($error): ?>
        <p style="color: red; font-weight: bold;"><?= htmlspecialchars($error) ?></p>
      <?php endif; ?>

      <form method="post">
        <label for="license_plate">License Plate</label>
        <input type="text" id="license_plate" name="license_plate" maxlength="20" required>

        <button type="submit">Issue Parking Slip</button>
      </form>
    </div>

    <?php if ($assignedSlip): ?>
      <div class="card">
        <h3>Parking Slip Details</h3>
        <p><strong>Slip ID:</strong> <?= htmlspecialchars($assignedSlip["parking_slip_id"]) ?></p>
        <p><strong>License Plate:</strong> <?= htmlspecialchars($assignedSlip["license_plate"]) ?></p>
        <p><strong>Entry Time:</strong> <?= htmlspecialchars($assignedSlip["entry_time"]) ?></p>
        <p><strong>Assigned Floor:</strong> <?= htmlspecialchars($assignedSlip["floor_number"]) ?> - <?= htmlspecialchars($assignedSlip["floor_name"]) ?></p>
        <p><strong>Assigned Slot:</strong> <?= htmlspecialchars($assignedSlip["slot_label"]) ?></p>
        <p><strong>Hourly Rate:</strong> $<?= htmlspecialchars($assignedSlip["hourly_rate"]) ?></p>
      </div>
    <?php endif; ?>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>