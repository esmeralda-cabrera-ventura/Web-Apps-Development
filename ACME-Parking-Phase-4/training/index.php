<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Attendant_Menu.jpg" alt="Training dashboard screenshot">
      <div class="training-text">
        <h1>Training Center</h1>
        <p>Welcome to the ACME Parking Training Center. These training pages are designed to help new hires learn how to use the system through written instructions and movie links. Every page below explains one use case and includes a link to the corresponding training video.</p>
        <div class="note-box">Each page below contains explanatory text and a direct movie link so new hires can learn each implemented use case.</div>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>Training Pages</h2>
    <div class="training-grid">
      <a class="training-tile" href="/acme_parking_phase_4/training/login_training.php">
        <h3>Logging In</h3>
        <p>Open the training page, read the instructions, and launch the related movie.</p>
      </a>
      <a class="training-tile" href="/acme_parking_phase_4/training/occupancy_training.php">
        <h3>Viewing Garage Occupancy</h3>
        <p>Open the training page, read the instructions, and launch the related movie.</p>
      </a>
      <a class="training-tile" href="/acme_parking_phase_4/training/checkin_training.php">
        <h3>Recording an Incoming Vehicle</h3>
        <p>Open the training page, read the instructions, and launch the related movie.</p>
      </a>
      <a class="training-tile" href="/acme_parking_phase_4/training/checkout_training.php">
        <h3>Recording a Leaving Vehicle</h3>
        <p>Open the training page, read the instructions, and launch the related movie.</p>
      </a>
      <a class="training-tile" href="/acme_parking_phase_4/training/manage_users_training.php">
        <h3>Managing Users</h3>
        <p>Open the training page, read the instructions, and launch the related movie.</p>
      </a>
      <a class="training-tile" href="/acme_parking_phase_4/training/valet_checkin_training.php">
        <h3>Valet Check In</h3>
        <p>Open the training page, read the instructions, and launch the related movie.</p>
      </a>
      <a class="training-tile" href="/acme_parking_phase_4/training/valet_checkout_training.php">
        <h3>Valet Check Out</h3>
        <p>Open the training page, read the instructions, and launch the related movie.</p>
      </a>
      <a class="training-tile" href="/acme_parking_phase_4/training/car_wash_schedule_training.php">
        <h3>Viewing Car Wash Schedule</h3>
        <p>Open the training page, read the instructions, and launch the related movie.</p>
      </a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
