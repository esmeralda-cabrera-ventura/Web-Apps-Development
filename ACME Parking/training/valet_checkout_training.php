<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Valet_Checkout_Successful.jpg" alt="Training: Valet Check Out screenshot">
      <div class="training-text">
        <h1>Training: Valet Check Out</h1>
        <p>This page explains how valet staff check out a valet vehicle. The system finds the active valet slip, calculates the parking and wash charges if applicable, and closes the transaction.</p>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>How to Perform This Use Case</h2>
    <ol class="training-list">
          <li>Log in as a valet user or administrator.</li>
          <li>Open the Valet Check Out page.</li>
          <li>Enter the license plate to locate the active valet record.</li>
          <li>Submit the checkout action.</li>
          <li>Review the summary showing parking fee, wash fee, and total due.</li>
    </ol>

    <div class="training-actions">
      <a class="training-btn" href="/acme_parking_phase_4/assets/videos/valet_checkout.mp4" target="_blank">Open Training Movie</a>
      <a class="training-btn secondary" href="/acme_parking_phase_4/valet_checkout.php">Open Live System Page</a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
