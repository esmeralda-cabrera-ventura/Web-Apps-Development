<?php
date_default_timezone_set('America/Los_Angeles');
require_once __DIR__ . '/includes/auth.php';
require_login();
require_once __DIR__ . '/includes/db.php';

$currentCategory = "parking";
$message = "";
$error = "";
$activeSlip = null;
$checkoutResult = null;

if (isset($_POST["search"])) {
    $licensePlate = strtoupper(trim($_POST["license_plate"] ?? ""));

    if ($licensePlate === "") {
        $error = "License plate is required.";
    } else {
        $stmt = $pdo->prepare("
            SELECT 
                p.parking_slip_id,
                p.license_plate,
                p.entry_time,
                p.hourly_rate,
                s.slot_label,
                f.floor_number,
                f.name AS floor_name
            FROM parkingslip p
            JOIN parkingslot s ON p.parking_slot_id = s.parking_slot_id
            JOIN floor f ON s.floor_id = f.floor_id
            WHERE p.license_plate = ?
              AND p.status = 'ACTIVE'
            ORDER BY p.entry_time DESC
            LIMIT 1
        ");
        $stmt->execute([$licensePlate]);
        $activeSlip = $stmt->fetch();

        if (!$activeSlip) {
            $error = "No active parking slip was found for that license plate.";
        }
    }
}

if (isset($_POST["checkout"])) {
    $parkingSlipId = (int)($_POST["parking_slip_id"] ?? 0);

    $stmt = $pdo->prepare("
        SELECT 
            p.parking_slip_id,
            p.license_plate,
            p.entry_time,
            p.hourly_rate,
            s.slot_label,
            f.floor_number,
            f.name AS floor_name
        FROM parkingslip p
        JOIN parkingslot s ON p.parking_slot_id = s.parking_slot_id
        JOIN floor f ON s.floor_id = f.floor_id
        WHERE p.parking_slip_id = ?
          AND p.status = 'ACTIVE'
        LIMIT 1
    ");
    $stmt->execute([$parkingSlipId]);
    $slip = $stmt->fetch();

    if (!$slip) {
        $error = "The active parking slip could not be found.";
    } else {
        $exitTime = date('Y-m-d H:i:s');

        $entryTimestamp = strtotime($slip["entry_time"]);
        $exitTimestamp = strtotime($exitTime);

        $minutesParked = ceil(($exitTimestamp - $entryTimestamp) / 60);
        if ($minutesParked < 1) {
            $minutesParked = 1;
        }

        $hoursCharged = ceil($minutesParked / 60);
        if ($hoursCharged < 1) {
            $hoursCharged = 1;
        }

        $hourlyRate = (float)$slip["hourly_rate"];
        $totalAmount = $hoursCharged * $hourlyRate;

        $updateStmt = $pdo->prepare("
            UPDATE parkingslip
            SET exit_time = ?,
                total_amount = ?,
                status = 'CLOSED'
            WHERE parking_slip_id = ?
        ");
        $updateStmt->execute([$exitTime, $totalAmount, $parkingSlipId]);

        $checkoutResult = [
            "parking_slip_id" => $slip["parking_slip_id"],
            "license_plate" => $slip["license_plate"],
            "entry_time" => $slip["entry_time"],
            "exit_time" => $exitTime,
            "floor_number" => $slip["floor_number"],
            "floor_name" => $slip["floor_name"],
            "slot_label" => $slip["slot_label"],
            "minutes_parked" => $minutesParked,
            "hours_charged" => $hoursCharged,
            "hourly_rate" => number_format($hourlyRate, 2),
            "total_amount" => number_format($totalAmount, 2)
        ];

        $message = "Vehicle checked out successfully.";
        $activeSlip = null;
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="layout">
  <?php require __DIR__ . '/includes/nav.php'; ?>

  <div class="main">
    <div class="card">
      <h2>Record Leaving Vehicle</h2>
      <p>Search by license plate to find the active parking slip and complete checkout.</p>

      <?php if ($message): ?>
        <p style="color: green; font-weight: bold;"><?= htmlspecialchars($message) ?></p>
      <?php endif; ?>

      <?php if ($error): ?>
        <p style="color: red; font-weight: bold;"><?= htmlspecialchars($error) ?></p>
      <?php endif; ?>

      <form method="post">
        <label for="license_plate">License Plate</label>
        <input type="text" id="license_plate" name="license_plate" maxlength="20" required>
        <button type="submit" name="search">Find Active Parking Slip</button>
      </form>
    </div>

    <?php if ($activeSlip): ?>
      <div class="card">
        <h3>Active Parking Slip Found</h3>
        <p><strong>Slip ID:</strong> <?= htmlspecialchars($activeSlip["parking_slip_id"]) ?></p>
        <p><strong>License Plate:</strong> <?= htmlspecialchars($activeSlip["license_plate"]) ?></p>
        <p><strong>Entry Time:</strong> <?= htmlspecialchars($activeSlip["entry_time"]) ?></p>
        <p><strong>Assigned Floor:</strong> <?= htmlspecialchars($activeSlip["floor_number"]) ?> - <?= htmlspecialchars($activeSlip["floor_name"]) ?></p>
        <p><strong>Assigned Slot:</strong> <?= htmlspecialchars($activeSlip["slot_label"]) ?></p>
        <p><strong>Hourly Rate:</strong> $<?= htmlspecialchars(number_format((float)$activeSlip["hourly_rate"], 2)) ?></p>

        <form method="post">
          <input type="hidden" name="parking_slip_id" value="<?= htmlspecialchars($activeSlip["parking_slip_id"]) ?>">
          <button type="submit" name="checkout">Complete Checkout</button>
        </form>
      </div>
    <?php endif; ?>

    <?php if ($checkoutResult): ?>
      <div class="card">
        <h3>Checkout Summary</h3>
        <p><strong>Slip ID:</strong> <?= htmlspecialchars($checkoutResult["parking_slip_id"]) ?></p>
        <p><strong>License Plate:</strong> <?= htmlspecialchars($checkoutResult["license_plate"]) ?></p>
        <p><strong>Entry Time:</strong> <?= htmlspecialchars($checkoutResult["entry_time"]) ?></p>
        <p><strong>Exit Time:</strong> <?= htmlspecialchars($checkoutResult["exit_time"]) ?></p>
        <p><strong>Floor:</strong> <?= htmlspecialchars($checkoutResult["floor_number"]) ?> - <?= htmlspecialchars($checkoutResult["floor_name"]) ?></p>
        <p><strong>Slot:</strong> <?= htmlspecialchars($checkoutResult["slot_label"]) ?></p>
        <p><strong>Minutes Parked:</strong> <?= htmlspecialchars($checkoutResult["minutes_parked"]) ?></p>
        <p><strong>Hours Charged:</strong> <?= htmlspecialchars($checkoutResult["hours_charged"]) ?></p>
        <p><strong>Hourly Rate:</strong> $<?= htmlspecialchars($checkoutResult["hourly_rate"]) ?></p>
        <p><strong>Total Amount Due:</strong> $<?= htmlspecialchars($checkoutResult["total_amount"]) ?></p>
      </div>
    <?php endif; ?>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>