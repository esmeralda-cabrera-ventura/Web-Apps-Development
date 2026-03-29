<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Occupancy_Updates.jpg" alt="Training: Viewing Garage Occupancy screenshot">
      <div class="training-text">
        <h1>Training: Viewing Garage Occupancy</h1>
        <p>This page shows staff how to review total spaces, occupied spaces, open spaces, and occupancy by floor. This is useful for answering customer questions and monitoring available parking throughout the garage.</p>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>How to Perform This Use Case</h2>
    <ol class="training-list">
          <li>Log in to the system.</li>
          <li>Open the Garage Occupancy page from the left navigation bar.</li>
          <li>Review the total number of spaces, occupied spaces, and open spaces.</li>
          <li>Review the floor-by-floor occupancy table.</li>
          <li>Use this information to answer questions about availability.</li>
    </ol>

    <div class="training-actions">
      <a class="training-btn" href="/acme_parking_phase_4/assets/videos/garage_occupancy.mp4" target="_blank">Open Training Movie</a>
      <a class="training-btn secondary" href="/acme_parking_phase_4/occupancy.php">Open Live System Page</a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
