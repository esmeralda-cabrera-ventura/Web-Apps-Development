<?php
date_default_timezone_set('America/Los_Angeles');
session_start();

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/role_check.php';
require_once __DIR__ . '/includes/valet_service.php';

require_role(['VALET', 'ADMIN']);

$message = '';
$error = '';
$checkout = null;
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

    try {
        $checkout = complete_valet_checkout($pdo, $licensePlate);
        $message = 'Valet vehicle checked out successfully.';

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

    <main class="main">
        <div class="content valet-page-shell">
            <h2 class="valet-page-title">Valet Check Out</h2>

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

            <section class="card">
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

            <section class="card">
                <h3>Record Leaving Valet Vehicle</h3>

                <form method="post" class="valet-form">
                    <label for="license_plate">License Plate</label>
                    <input type="text" id="license_plate" name="license_plate" maxlength="20" required>

                    <button type="submit">Check Out Valet Vehicle</button>
                </form>
            </section>

            <?php if ($checkout): ?>
                <section class="card">
                    <h3>Valet Checkout Summary</h3>
                    <p><strong>Slip ID:</strong> <?php echo htmlspecialchars($checkout['parking_slip_id']); ?></p>
                    <p><strong>License Plate:</strong> <?php echo htmlspecialchars($checkout['license_plate']); ?></p>
                    <p><strong>Floor:</strong> <?php echo htmlspecialchars($checkout['floor_number']); ?></p>
                    <p><strong>Slot:</strong> <?php echo htmlspecialchars($checkout['slot_label']); ?></p>
                    <p><strong>Entry Time:</strong> <?php echo htmlspecialchars($checkout['entry_time']); ?></p>
                    <p><strong>Exit Time:</strong> <?php echo htmlspecialchars($checkout['exit_time']); ?></p>
                    <p><strong>Minutes Parked:</strong> <?php echo htmlspecialchars($checkout['minutes_parked']); ?></p>
                    <p><strong>Hours Charged:</strong> <?php echo htmlspecialchars($checkout['hours_to_charge']); ?></p>
                    <p><strong>Parking Fee:</strong> $<?php echo number_format($checkout['parking_fee'], 2); ?></p>
                    <p><strong>Car Wash Requested:</strong> <?php echo $checkout['car_wash_requested'] ? 'Yes' : 'No'; ?></p>
                    <p><strong>Car Wash Fee:</strong> $<?php echo number_format($checkout['car_wash_fee'], 2); ?></p>
                    <p><strong>Total Due:</strong> $<?php echo number_format($checkout['total_due'], 2); ?></p>
                </section>
            <?php endif; ?>
        </div>
    </main>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>