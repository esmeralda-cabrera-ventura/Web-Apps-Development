<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Valet_Checkin_Successful.jpg" alt="Training: Valet Check In screenshot">
      <div class="training-text">
        <h1>Training: Valet Check In</h1>
        <p>This page explains how valet staff record an incoming valet vehicle. The user enters the customer vehicle information, records valet service, and may request a car wash when the request qualifies.</p>
    </div>
  </section>

  <section class="card">
    <h2>How to Perform This Use Case</h2>
    <ol class="training-list">
          <li>Log in as a valet user or administrator.</li>
          <li>Open the Valet Check In page.</li>
          <li>Enter the vehicle information and confirm valet service.</li>
          <li>Select the car wash request option when appropriate.</li>
          <li>Submit the form and confirm the successful valet entry.</li>
    </ol>

    <div class="training-actions">
      <a class="training-btn" href="/acme_parking_phase_4/assets/videos/valet_checkin.mp4" target="_blank">Open Training Movie</a>
      <a class="training-btn secondary" href="/acme_parking_phase_4/valet_checkin.php">Open Live System Page</a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
