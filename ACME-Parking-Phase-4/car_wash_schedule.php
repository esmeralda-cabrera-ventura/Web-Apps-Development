<?php
date_default_timezone_set('America/Los_Angeles');
session_start();

require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/role_check.php';
require_once __DIR__ . '/includes/valet_service.php';

require_role(['VALET', 'ADMIN']);

$error = '';
$currentCategory = 'valet';

try {
    $valetFloorNumber = get_valet_floor_number($pdo);
    $openValetSpaces = get_open_valet_spaces($pdo);
    $schedule = get_active_car_wash_schedule($pdo);
} catch (Exception $e) {
    $valetFloorNumber = 1;
    $openValetSpaces = 0;
    $schedule = [];
    $error = 'Failed to load car wash schedule: ' . $e->getMessage();
}

require_once __DIR__ . '/includes/header.php';
?>

<div class="layout">
    <?php require __DIR__ . '/includes/nav.php'; ?>

    <main class="main">
        <div class="content valet-page-shell">
            <h2 class="valet-page-title">Car Wash Schedule</h2>

            <p class="valet-user-line">
                <strong>Current User:</strong>
                <?php echo htmlspecialchars($_SESSION['user']['username']); ?>
                |
                <strong>Role:</strong>
                <?php echo htmlspecialchars($_SESSION['user']['role']); ?>
            </p>

            <?php if ($error !== ''): ?>
                <div class="error-message"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <section class="card">
                <h3>Valet Floor Summary</h3>
                <p><strong>Valet Floor:</strong> <?php echo htmlspecialchars($valetFloorNumber); ?></p>
                <p><strong>Open Valet Spaces:</strong> <?php echo htmlspecialchars($openValetSpaces); ?></p>
            </section>

            <section class="card">
                <h3>Active Car Wash Requests</h3>

                <table>
                    <thead>
                        <tr>
                            <th>Slip ID</th>
                            <th>License Plate</th>
                            <th>Entry Time</th>
                            <th>Floor</th>
                            <th>Slot</th>
                            <th>Wash Eligible</th>
                            <th>Car Wash Fee</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (!empty($schedule)): ?>
                            <?php foreach ($schedule as $row): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($row['parking_slip_id']); ?></td>
                                    <td><?php echo htmlspecialchars($row['license_plate']); ?></td>
                                    <td><?php echo htmlspecialchars($row['entry_time']); ?></td>
                                    <td><?php echo htmlspecialchars($row['floor_number']); ?></td>
                                    <td><?php echo htmlspecialchars($row['slot_label']); ?></td>
                                    <td><?php echo $row['wash_eligible'] ? 'Yes' : 'No'; ?></td>
                                    <td>$<?php echo number_format((float)$row['car_wash_fee'], 2); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <tr>
                                <td colspan="7">No active car wash requests found.</td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </section>
        </div>
    </main>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>