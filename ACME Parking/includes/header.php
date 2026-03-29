<?php
if (session_status() === PHP_SESSION_NONE) {
  session_start();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ACME Parking</title>
  <link rel="stylesheet" href="/acme_parking_phase_4/assets/css/styles.css">
</head>
<body>
  <div class="header">

    <?php if (!empty($_SESSION["user"])): ?>
      <div class="top-right">
        Logged in as: <strong><?php echo htmlspecialchars($_SESSION["user"]["username"]); ?></strong>
        <span class="badge"><?php echo htmlspecialchars($_SESSION["user"]["role"]); ?></span>
      </div>
    <?php endif; ?>

  </div>