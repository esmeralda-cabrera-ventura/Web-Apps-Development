<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Attendant_Login.jpg" alt="Training: Logging In screenshot">
      <div class="training-text">
        <h1>Training: Logging In</h1>
        <p>This page teaches new hires how to access the ACME Parking employee portal securely.</p>
    </div>
  </section>

  <section class="card">
    <h2>How to Perform This Use Case</h2>
    <ol class="training-list">
          <li>Open the ACME Parking website at the default index page.</li>
          <li>Click the Login button if needed and enter a valid username and password.</li>
          <li>Submit the login form.</li>
          <li>Confirm that the dashboard loads successfully.</li>
          <li>Verify that the logged-in username and role appear in the header.</li>
    </ol>

    <div class="training-actions">
      <a class="training-btn" href="/acme_parking_phase_4/assets/videos/login.mp4" target="_blank">Open Training Movie</a>
      <a class="training-btn secondary" href="/acme_parking_phase_4/index.php">Open Live System Page</a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
