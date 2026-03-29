<?php
require_once __DIR__ . "/../includes/auth.php";
require_login();
if (!is_admin()) { header("Location: /acme_parking_phase_4/dashboard.php"); exit; }

require_once __DIR__ . "/../includes/db.php";

$id = (int)($_GET["id"] ?? 0);

$stmt = $pdo->prepare("SELECT user_id, username, full_name, email, role, is_active FROM UserOperator WHERE user_id = ?");
$stmt->execute([$id]);
$user = $stmt->fetch();

if (!$user) { header("Location: /acme_parking_phase_4/users/list.php"); exit; }

$msg = "";
$err = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
  $full_name = trim($_POST["full_name"] ?? "");
  $email = trim($_POST["email"] ?? "");
  $role = $_POST["role"] ?? "OPERATOR";
  $is_active = isset($_POST["is_active"]) ? 1 : 0;
  $new_password = $_POST["new_password"] ?? "";

  if ($full_name === "" || $email === "") {
    $err = "Full name and email are required.";
  } else {
    try {
      if ($new_password !== "") {
        $hash = password_hash($new_password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare("UPDATE UserOperator SET full_name=?, email=?, role=?, is_active=?, password_hash=? WHERE user_id=?");
        $stmt->execute([$full_name, $email, $role, $is_active, $hash, $id]);
      } else {
        $stmt = $pdo->prepare("UPDATE UserOperator SET full_name=?, email=?, role=?, is_active=? WHERE user_id=?");
        $stmt->execute([$full_name, $email, $role, $is_active, $id]);
      }

      $msg = "User updated.";

      $stmt = $pdo->prepare("SELECT user_id, username, full_name, email, role, is_active FROM UserOperator WHERE user_id = ?");
      $stmt->execute([$id]);
      $user = $stmt->fetch();
    } catch (Exception $e) {
      $err = "Update failed.";
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
      <h1> Edit User</h1>
      <p>Editing: <strong><?php echo htmlspecialchars($user["username"]); ?></strong></p>

      <?php if ($msg): ?><div class="msg ok"><?php echo htmlspecialchars($msg); ?></div><?php endif; ?>
      <?php if ($err): ?><div class="msg err"><?php echo htmlspecialchars($err); ?></div><?php endif; ?>

      <form method="POST" autocomplete="off">
        <label>Full Name</label>
        <input name="full_name" value="<?php echo htmlspecialchars($user["full_name"]); ?>" required>

        <label>Email</label>
        <input type="email" name="email" value="<?php echo htmlspecialchars($user["email"]); ?>" required>

        <label>Role</label>
        <select name="role">
          <option value="OPERATOR" <?php if ($user["role"] === "OPERATOR") echo "selected"; ?>>OPERATOR</option>
          <option value="ADMIN" <?php if ($user["role"] === "ADMIN") echo "selected"; ?>>ADMIN</option>
        </select>

        <label>
          <input type="checkbox" name="is_active" <?php if ((int)$user["is_active"] === 1) echo "checked"; ?>>
          Active
        </label>

        <label>Reset Password (optional)</label>
        <input type="password" name="new_password" placeholder="Leave blank to keep current">

        <button class="btn-primary" type="submit">Save</button>
      </form>
    </div>
  </div>
</div>
<?php require_once __DIR__ . "/../includes/footer.php"; ?>