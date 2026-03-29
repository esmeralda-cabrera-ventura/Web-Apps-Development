<?php
require_once __DIR__ . '/auth.php';

function require_role(array $allowed_roles): void
{
    if (empty($_SESSION["user"]) || !in_array($_SESSION["user"]["role"], $allowed_roles, true)) {
        header("Location: /acme_parking_phase_4/dashboard.php");
        exit;
    }
}