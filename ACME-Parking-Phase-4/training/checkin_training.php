<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Attendant_Portal_Vehicle_Checkin_Successful.jpg" alt="Training: Recording an Incoming Vehicle screenshot">
      <div class="training-text">
        <h1>Training: Recording an Incoming Vehicle</h1>
        <p>This page explains how an attendant or administrator records a vehicle entering the garage. The user enters the license plate and vehicle information, the system assigns a space, and a parking slip is created.</p>
    </div>
  </section>

  <section class="card">
    <h2>How to Perform This Use Case</h2>
    <ol class="training-list">
          <li>Log in to the system.</li>
          <li>Open the Record Incoming Vehicle page.</li>
          <li>Enter the required vehicle details such as license plate and other requested information.</li>
          <li>Submit the form to create the parking entry.</li>
          <li>Confirm the success message and assigned parking information.</li>
    </ol>

    <div class="training-actions">
      <a class="training-btn" href="/acme_parking_phase_4/assets/videos/incoming_vehicle.mp4" target="_blank">Open Training Movie</a>
      <a class="training-btn secondary" href="/acme_parking_phase_4/checkin.php">Open Live System Page</a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
