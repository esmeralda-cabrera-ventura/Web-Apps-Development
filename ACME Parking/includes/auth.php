<?php
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}

function require_login() {
  if (empty($_SESSION["user"])) {
    header("Location: /acme_parking_phase_4/index.php");
    exit;
  }
}

function is_admin() {
  return !empty($_SESSION["user"]) && $_SESSION["user"]["role"] === "ADMIN";
}