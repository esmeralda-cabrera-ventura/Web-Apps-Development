<?php
require_once __DIR__ . "/../includes/auth.php";
require_login();
if (!is_admin()) { header("Location: /acme_parking_phase_4/dashboard.php"); exit; }

require_once __DIR__ . "/../includes/db.php";

$msg = "";
$err = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
  $username = trim($_POST["username"] ?? "");
  $password = $_POST["password"] ?? "";
  $full_name = trim($_POST["full_name"] ?? "");
  $email = trim($_POST["email"] ?? "");
  $role = $_POST["role"] ?? "OPERATOR";

  if ($username === "" || $password === "" || $full_name === "" || $email === "") {
    $err = "All fields are required.";
  } else {
    try {
      $hash = password_hash($password, PASSWORD_BCRYPT);
      $stmt = $pdo->prepare("INSERT INTO UserOperator (username, password_hash, full_name, email, role) VALUES (?,?,?,?,?)");
      $stmt->execute([$username, $hash, $full_name, $email, $role]);
      $msg = "User created successfully.";
    } catch (Exception $e) {
      $err = "Create failed. Username or email may already exist.";
    }
  }
}

require_once __DIR__ . "/../includes/header.php";
$currentCategory = "users";
?>
<div class="layout">
  <?php require __DIR__ . "/../includes/nav.php"; ?>

  <div class="main">
    <div class="card">
      <h1>Create User/Operator</h1>

      <?php if ($msg): ?>
        <div class="msg ok" style="color: green; font-weight: bold;">
          <?php echo htmlspecialchars($msg); ?>
        </div>
      <?php endif; ?>

      <?php if ($err): ?>
        <div class="msg err">
          <?php echo htmlspecialchars($err); ?>
        </div>
      <?php endif; ?>

      <form method="POST" autocomplete="off">
        <label>Username</label>
        <input name="username" required>

        <label>Temporary Password</label>
        <input type="password" name="password" required>

        <label>Full Name</label>
        <input name="full_name" required>

        <label>Email</label>
        <input type="email" name="email" required>

        <label>Role</label>
        <select name="role">
          <option value="OPERATOR">OPERATOR</option>
          <option value="ATTENDANT">ATTENDANT</option>
          <option value="VALET">VALET</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <button class="btn-primary" type="submit">Create</button>
      </form>
    </div>
  </div>
</div>
<?php require_once __DIR__ . "/../includes/footer.php"; ?>