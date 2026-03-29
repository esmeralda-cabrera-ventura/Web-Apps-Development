<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Car_Wash_Schedule.jpg" alt="Training: Viewing Car Wash Schedule screenshot">
      <div class="training-text">
        <h1>Training: Viewing Car Wash Schedule</h1>
        <p>This page explains how valet staff review the current car wash schedule. The schedule displays active wash requests for qualifying valet vehicles so attendants can track pending work and service status.</p>
    </div>
  </section>

  <section class="card">
    <h2>How to Perform This Use Case</h2>
    <ol class="training-list">
          <li>Log in as a valet user or administrator.</li>
          <li>Open the Car Wash Schedule page.</li>
          <li>Review the active wash requests table.</li>
          <li>Check the slip ID, license plate, floor, slot, and wash fee.</li>
          <li>Use the schedule to organize active wash work during business hours.</li>
    </ol>

    <div class="training-actions">
      <a class="training-btn" href="/acme_parking_phase_4/assets/videos/car_wash_schedule.mp4" target="_blank">Open Training Movie</a>
      <a class="training-btn secondary" href="/acme_parking_phase_4/car_wash_schedule.php">Open Live System Page</a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
