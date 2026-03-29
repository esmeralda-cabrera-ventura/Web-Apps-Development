<?php
date_default_timezone_set('America/Los_Angeles');
session_start();
require_once __DIR__ . "/includes/db.php";

$error = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
  $username = trim($_POST["username"] ?? "");
  $password = $_POST["password"] ?? "";

  $stmt = $pdo->prepare("SELECT user_id, username, password_hash, role, is_active FROM useroperator WHERE username = ?");
  $stmt->execute([$username]);
  $user = $stmt->fetch();

  if (!$user || (int)$user["is_active"] !== 1 || !password_verify($password, $user["password_hash"])) {
    $error = "Invalid username or password.";
  } else {
    $_SESSION["user"] = [
      "user_id" => $user["user_id"],
      "username" => $user["username"],
      "role" => $user["role"]
    ];
    header("Location: /acme_parking_phase_4/dashboard.php");
    exit;
  }
}

require_once __DIR__ . "/includes/header.php";
$currentCategory = "home";
?>
<div class="layout">
  <?php require __DIR__ . "/includes/nav.php"; ?>

  <div class="main">
    <div class="card">
      <h1>ACME Parking Employee Portal</h1>
      <p>Please enter your login credentials to access your account.</p>

      <?php if ($error): ?>
        <div class="msg err"><?php echo htmlspecialchars($error); ?></div>
      <?php endif; ?>

      <form method="POST" autocomplete="off">
        <label>Username</label>
        <input name="username" required>

        <label>Password</label>
        <input type="password" name="password" required>

        <button class="btn-primary" type="submit">Login</button>
      </form>
    </div>
  </div>
</div>
<?php require_once __DIR__ . "/includes/footer.php"; ?>