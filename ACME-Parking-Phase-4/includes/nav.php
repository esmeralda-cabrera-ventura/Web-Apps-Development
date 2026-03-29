<?php
require_once __DIR__ . "/auth.php";
$currentCategory = $currentCategory ?? "home";
$currentUser = $_SESSION["user"] ?? null;
$currentRole = $currentUser["role"] ?? null;
?>
<div class="nav">

    <?php if (empty($currentUser)): ?>
        <div class="nav-title">Access</div>
        <a href="/acme_parking_phase_4/index.php">Login</a>

    <?php else: ?>
        <div class="nav-title">Navigate</div>
        <a href="/acme_parking_phase_4/dashboard.php">Home</a>

        <div class="nav-title">Training</div>
        <a href="/acme_parking_phase_4/training/index.php">Training Home</a>
        <a href="/acme_parking_phase_4/training/login_training.php">Logging In</a>
        <a href="/acme_parking_phase_4/training/occupancy_training.php">Garage Occupancy</a>
        <a href="/acme_parking_phase_4/training/checkin_training.php">Incoming Vehicle</a>
        <a href="/acme_parking_phase_4/training/checkout_training.php">Leaving Vehicle</a>
        <a href="/acme_parking_phase_4/training/valet_checkin_training.php">Valet Check In</a>
        <a href="/acme_parking_phase_4/training/valet_checkout_training.php">Valet Check Out</a>
        <a href="/acme_parking_phase_4/training/car_wash_schedule_training.php">Car Wash Schedule</a>
        <?php if (is_admin()): ?>
            <a href="/acme_parking_phase_4/training/manage_users_training.php">Managing Users</a>
        <?php endif; ?>

        <?php if ($currentRole === 'OPERATOR' || $currentRole === 'ATTENDANT' || $currentRole === 'ADMIN'): ?>
            <div class="nav-title">Parking</div>
            <a href="/acme_parking_phase_4/occupancy.php">Garage Occupancy</a>
            <a href="/acme_parking_phase_4/checkin.php">Record Incoming Vehicle</a>
            <a href="/acme_parking_phase_4/checkout.php">Record Leaving Vehicle</a>
        <?php endif; ?>

        <?php if ($currentRole === 'VALET' || $currentRole === 'ADMIN'): ?>
            <div class="nav-title">Valet</div>
            <a href="/acme_parking_phase_4/valet_checkin.php">Valet Check In</a>
            <a href="/acme_parking_phase_4/valet_checkout.php">Valet Check Out</a>
            <a href="/acme_parking_phase_4/car_wash_schedule.php">Car Wash Schedule</a>
        <?php endif; ?>

        <?php if (is_admin()): ?>
            <div class="nav-title">Admin</div>
            <a href="/acme_parking_phase_4/users/list.php">Manage Users</a>
            <?php if ($currentCategory === "users"): ?>
                <a href="/acme_parking_phase_4/users/create.php">Create User</a>
            <?php endif; ?>
        <?php endif; ?>

        <div class="nav-title">Session</div>
        <a href="/acme_parking_phase_4/auth/logout.php">Logout</a>
    <?php endif; ?>

</div>
