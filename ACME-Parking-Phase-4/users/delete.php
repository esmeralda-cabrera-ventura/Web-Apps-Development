<?php
require_once __DIR__ . "/../includes/auth.php";
require_login();
if (!is_admin()) { header("Location: /acme_parking_phase_4/dashboard.php"); exit; }

require_once __DIR__ . "/../includes/db.php";

$id = (int)($_GET["id"] ?? 0);

$stmt = $pdo->prepare("SELECT user_id, username FROM UserOperator WHERE user_id = ?");
$stmt->execute([$id]);
$user = $stmt->fetch();

if (!$user) { header("Location: /acme_parking_phase_4/users/list.php"); exit; }

if ($_SERVER["REQUEST_METHOD"] === "POST") {
  $stmt = $pdo->prepare("DELETE FROM UserOperator WHERE user_id = ?");
  $stmt->execute([$id]);
  header("Location: /acme_parking_phase_4/users/list.php");
  exit;
}

require_once __DIR__ . "/../includes/header.php";
$currentCategory = "users";
?>
<div class="layout">
  <?php require __DIR__ . "/../includes/nav.php"; ?>

  <div class="main">
    <div class="card">
      <h1> Delete User</h1>
      <p>Are you sure you want to delete <strong><?php echo htmlspecialchars($user["username"]); ?></strong>?</p>

      <form method="POST">
        <button class="btn-danger" type="submit">Yes, Delete</button>
        <a href="/acme_parking_phase_4/users/list.php" style="margin-left:10px;">Cancel</a>
      </form>
    </div>
  </div>
</div>
<?php require_once __DIR__ . "/../includes/footer.php"; ?>