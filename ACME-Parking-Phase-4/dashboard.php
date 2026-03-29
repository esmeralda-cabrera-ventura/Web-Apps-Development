<?php
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/header.php';

$currentCategory = 'home';
$currentRole = $_SESSION['user']['role'] ?? '';
?>

<div class="layout">
    <?php require __DIR__ . '/includes/nav.php'; ?>

    <div class="main">
        <div class="card">
            <h1>Home</h1>

            <?php if ($currentRole === 'ATTENDANT' || $currentRole === 'ATTENDANT'): ?>
                <p><a href="/acme_parking_phase_4/occupancy.php">View Parking Garage Occupancy</a></p>
                <p><a href="/acme_parking_phase_4/checkin.php">Record Incoming Vehicle</a></p>
                <p><a href="/acme_parking_phase_4/checkout.php">Record Leaving Vehicle</a></p>

            <?php elseif ($currentRole === 'VALET'): ?>
                <p><a href="/acme_parking_phase_4/valet_checkin.php">Valet Check In</a></p>
                <p><a href="/acme_parking_phase_4/valet_checkout.php">Valet Check Out</a></p>
                <p><a href="/acme_parking_phase_4/car_wash_schedule.php">Car Wash Schedule</a></p>

            <?php elseif ($currentRole === 'ADMIN'): ?>
                <p><a href="/acme_parking_phase_4/occupancy.php">View Parking Garage Occupancy</a></p>
                <p><a href="/acme_parking_phase_4/checkin.php">Record Incoming Vehicle</a></p>
                <p><a href="/acme_parking_phase_4/checkout.php">Record Leaving Vehicle</a></p>
                <p><a href="/acme_parking_phase_4/valet_checkin.php">Valet Check In</a></p>
                <p><a href="/acme_parking_phase_4/valet_checkout.php">Valet Check Out</a></p>
                <p><a href="/acme_parking_phase_4/car_wash_schedule.php">Car Wash Schedule</a></p>
                <p><a href="/acme_parking_phase_4/users/list.php">Manage Users</a></p>
            <?php endif; ?>

            <p><a href="/acme_parking_phase_4/training/index.php">Open Training Center</a></p>

            <p>Your account is active. If you encounter any technical issues, please contact your administrator.</p>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>