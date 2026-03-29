<?php
require_once __DIR__ . "/../includes/auth.php";
require_login();
if (!is_admin()) { header("Location: /acme_parking_phase_4/dashboard.php"); exit; }

require_once __DIR__ . "/../includes/db.php";

$users = $pdo->query("SELECT user_id, username, full_name, email, role, is_active, created_at FROM UserOperator ORDER BY created_at DESC")->fetchAll();

require_once __DIR__ . "/../includes/header.php";
$currentCategory = "users";
?>
<div class="layout">
  <?php require __DIR__ . "/../includes/nav.php"; ?>

  <div class="main">
    <div class="card">
      <h1>👤 User Management</h1>
      <p>Manage employee accounts for ACME Parking.</p>

      <table class="table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <?php foreach ($users as $u): ?>
            <tr>
              <td><?php echo htmlspecialchars($u["username"]); ?></td>
              <td><?php echo htmlspecialchars($u["full_name"]); ?></td>
              <td><?php echo htmlspecialchars($u["email"]); ?></td>
              <td><?php echo htmlspecialchars($u["role"]); ?></td>
              <td><?php echo ((int)$u["is_active"] === 1) ? "Yes" : "No"; ?></td>
              <td>
                <a href="/acme_parking_phase_4/users/edit.php?id=<?php echo (int)$u["user_id"]; ?>">Edit</a>
                | <a href="/acme_parking_phase_4/users/delete.php?id=<?php echo (int)$u["user_id"]; ?>">Delete</a>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>

    </div>
  </div>
</div>
<?php require_once __DIR__ . "/../includes/footer.php"; ?>