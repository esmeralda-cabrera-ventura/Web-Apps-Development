<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Attendant_Portal_Vehicle_Checkout_Successful.jpg" alt="Training: Recording a Leaving Vehicle screenshot">
      <div class="training-text">
        <h1>Training: Recording a Leaving Vehicle</h1>
        <p>This page explains how an attendant or administrator checks a vehicle out of the garage. The user searches the active record, confirms the exit, and the system calculates the amount due while freeing the parking space.</p>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>How to Perform This Use Case</h2>
    <ol class="training-list">
          <li>Log in to the system.</li>
          <li>Open the Record Leaving Vehicle page.</li>
          <li>Enter the vehicle identifier or locate the active parking slip.</li>
          <li>Submit the checkout action.</li>
          <li>Review the total due and confirm that the space is released.</li>
    </ol>

    <div class="training-actions">
      <a class="training-btn" href="/acme_parking_phase_4/assets/videos/leaving_vehicle.mp4" target="_blank">Open Training Movie</a>
      <a class="training-btn secondary" href="/acme_parking_phase_4/checkout.php">Open Live System Page</a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
