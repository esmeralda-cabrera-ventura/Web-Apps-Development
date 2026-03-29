<?php
$currentCategory = "training";
require_once __DIR__ . "/../includes/training_page_start.php";
?>
<div class="content">
  <section class="card">
    <div class="training-media">
      <img class="training-shot" src="/acme_parking_phase_4/assets/image/training/Managing_Users.jpg" alt="Training: Managing Users screenshot">
      <div class="training-text">
        <h1>Training: Managing Users</h1>
        <p>This page explains how an administrator manages employee accounts. The administrator can review users, create new users, edit existing users, and maintain role-based access for Admin, Valet, and Attendant accounts.</p>
      </div>
    </div>
  </section>

  <section class="card">
    <h2>How to Perform This Use Case</h2>
    <ol class="training-list">
          <li>Log in as an administrator.</li>
          <li>Open the Manage Users page from the left navigation bar.</li>
          <li>Review the list of employee accounts.</li>
          <li>Create, edit, or delete users as needed. To create a new user, you must first click on manage users. A create user button will display under the manage users button. Creat a new user by following the prompts.</li>
          <li>Confirm that each account has the correct role and active status.</li>
    </ol>

    <div class="training-actions">
      <a class="training-btn" href="/acme_parking_phase_4/assets/videos/manage_users.mp4" target="_blank">Open Training Movie</a>
      <a class="training-btn secondary" href="/acme_parking_phase_4/users/list.php">Open Live System Page</a>
    </div>
  </section>
</div>
<?php require_once __DIR__ . "/../includes/training_page_end.php"; ?>
