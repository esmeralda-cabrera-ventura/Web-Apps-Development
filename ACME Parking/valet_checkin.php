<?php
date_default_timezone_set('America/Los_Angeles');
session_start();

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/role_check.php';
require_once __DIR__ . '/includes/valet_service.php';

require_role(['VALET', 'ADMIN']);

$message = '';
$error = '';
$slip = null;
$currentCategory = 'valet';

try {
    $valetFloorNumber = get_valet_floor_number($pdo);
    $openValetSpaces = get_open_valet_spaces($pdo);
    $otherFloorSpaces = get_other_floor_spaces($pdo);
} catch (Exception $e) {
    $valetFloorNumber = 1;
    $openValetSpaces = 0;
    $otherFloorSpaces = [];
    $error = 'Failed to load parking availability: ' . $e->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $licensePlate = $_POST['license_plate'] ?? '';
    $carWashRequested = isset($_POST['car_wash_requested']) ? 1 : 0;

    try {
        $slip = create_valet_checkin($pdo, $licensePlate, $carWashRequested);
        $message = 'Valet vehicle checked in successfully.';

        $valetFloorNumber = get_valet_floor_number($pdo);
        $openValetSpaces = get_open_valet_spaces($pdo);
        $otherFloorSpaces = get_other_floor_spaces($pdo);
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="layout">
    <?php require __DIR__ . '/includes/nav.php'; ?>

    <main class="content valet-page-content">
        <div class="valet-page-shell">
            <h2 class="valet-page-title">Valet Check In</h2>

            <p class="valet-user-line">
                <strong>Current User:</strong>
                <?php echo htmlspecialchars($_SESSION['user']['username']); ?>
                |
                <strong>Role:</strong>
                <?php echo htmlspecialchars($_SESSION['user']['role']); ?>
            </p>

            <?php if ($message !== ''): ?>
                <div class="success-message"><?php echo htmlspecialchars($message); ?></div>
            <?php endif; ?>

            <?php if ($error !== ''): ?>
                <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <section class="card valet-card">
                <h3>Parking Availability</h3>
                <p>
                    <strong>Open Valet Spaces on Floor <?php echo htmlspecialchars($valetFloorNumber); ?>:</strong>
                    <?php echo $openValetSpaces; ?>
                </p>
                <p class="valet-note">
                    Valet parking is restricted to Floor <?php echo htmlspecialchars($valetFloorNumber); ?> only.
                </p>

                <h4>Open Spaces on Other Floors</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Floor</th>
                            <th>Total Slots</th>
                            <th>Open Spaces</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($otherFloorSpaces)): ?>
                            <?php foreach ($otherFloorSpaces as $row): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($row['floor_number']); ?></td>
                                    <td><?php echo htmlspecialchars($row['total_slots']); ?></td>
                                    <td><?php echo htmlspecialchars($row['open_spaces']); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="3">No non-valet floor data available.</td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </section>

            <section class="card valet-card">
                <h3>Record Incoming Valet Vehicle</h3>
                <p style="color: #555; font-size: 14px; margin-bottom: 10px;">
                  Car wash service hours are from 8:00 a.m. to 4:00 p.m. daily. Car wash service is available to valet customers only.
                 </p>

                <form method="post" class="valet-form">
                    <label for="license_plate">License Plate</label>
                    <input type="text" id="license_plate" name="license_plate" maxlength="20" required>

                    <div class="checkbox-row">
                        <span class="checkbox-row-text">Request Car Wash (+$30.00)</span>
                        <input type="checkbox" id="car_wash_requested" name="car_wash_requested" value="1">
                    </div>

                    <button type="submit">Issue Valet Parking Slip</button>
                </form>
            </section>

            <?php if ($slip): ?>
                <section class="card valet-card">
                    <h3>Valet Slip Issued</h3>
                    <p><strong>Slip ID:</strong> <?php echo htmlspecialchars($slip['parking_slip_id']); ?></p>
                    <p><strong>License Plate:</strong> <?php echo htmlspecialchars($slip['license_plate']); ?></p>
                    <p><strong>Assigned Floor:</strong> <?php echo htmlspecialchars($slip['floor_number']); ?></p>
                    <p><strong>Assigned Slot:</strong> <?php echo htmlspecialchars($slip['slot_label']); ?></p>
                    <p><strong>Car Wash Requested:</strong> <?php echo $slip['car_wash_requested'] ? 'Yes' : 'No'; ?></p>
                    <p><strong>Wash Eligible:</strong> <?php echo $slip['wash_eligible'] ? 'Yes' : 'No'; ?></p>
                    <p><strong>Car Wash Fee:</strong> $<?php echo number_format($slip['car_wash_fee'], 2); ?></p>
                </section>
            <?php endif; ?>
        </div>
    </main>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>