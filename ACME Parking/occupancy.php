<?php 
require_once __DIR__ . '/includes/auth.php';
require_login();
require_once __DIR__ . '/includes/db.php';

$totalSlotsStmt = $pdo->query("
    SELECT COUNT(*) AS total_slots
    FROM parkingslot
    WHERE is_active = 1
");
$totalSlots = $totalSlotsStmt->fetch()['total_slots'];

$occupiedStmt = $pdo->query("
    SELECT COUNT(DISTINCT ps.parking_slot_id) AS occupied_slots
    FROM parkingslip ps
    WHERE ps.status = 'ACTIVE'
");
$occupiedSlots = $occupiedStmt->fetch()['occupied_slots'];

$openSlots = $totalSlots - $occupiedSlots;

$floorStmt = $pdo->query("
    SELECT
        f.floor_id,
        f.floor_number,
        f.name,
        COUNT(s.parking_slot_id) AS total_slots,
        COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN s.parking_slot_id END) AS occupied_slots,
        COUNT(s.parking_slot_id) - COUNT(DISTINCT CASE WHEN p.status = 'ACTIVE' THEN s.parking_slot_id END) AS open_slots
    FROM floor f
    JOIN parkingslot s ON f.floor_id = s.floor_id
    LEFT JOIN parkingslip p
        ON s.parking_slot_id = p.parking_slot_id
        AND p.status = 'ACTIVE'
    WHERE s.is_active = 1
    GROUP BY f.floor_id, f.floor_number, f.name
    ORDER BY f.floor_number
");

$currentCategory = "occupancy";
require_once __DIR__ . '/includes/header.php';
?>

<style>
.occupancy-table-wrap{
  width:100%;
  overflow-x:auto;
  margin-top:18px;
}

table.occupancy-table{
  width:100%;
  table-layout:fixed;
  border-collapse:collapse;
  margin-top:10px;
}

table.occupancy-table th{
  text-align:center;
  padding:20px 32px;
  font-size:17px;
  font-weight:800;
  color:#0b1b46;
  border-bottom:2px solid #dbe4ff;
  white-space:nowrap;
}

table.occupancy-table td{
  text-align:center;
  padding:18px 32px;
  font-size:16px;
  color:#24324a;
  border-bottom:1px solid #e8edf5;
}

table.occupancy-table tbody tr:last-child td{
  border-bottom:none;
}

table.occupancy-table th:nth-child(1),
table.occupancy-table td:nth-child(1){
  width:18%;
}

table.occupancy-table th:nth-child(2),
table.occupancy-table td:nth-child(2){
  width:28%;
}

table.occupancy-table th:nth-child(3),
table.occupancy-table td:nth-child(3),
table.occupancy-table th:nth-child(4),
table.occupancy-table td:nth-child(4),
table.occupancy-table th:nth-child(5),
table.occupancy-table td:nth-child(5){
  width:18%;
}
</style>

<div class="layout">
  <?php require __DIR__ . '/includes/nav.php'; ?>

  <div class="main">
    <div class="card">
      <h2>Parking Garage Occupancy</h2>

      <p><strong>Total Spaces:</strong> <?= htmlspecialchars($totalSlots) ?></p>
      <p><strong>Occupied Spaces:</strong> <?= htmlspecialchars($occupiedSlots) ?></p>
      <p><strong>Open Spaces Available:</strong> <?= htmlspecialchars($openSlots) ?></p>
    </div>

    <div class="card">
      <h3>Open Spaces by Floor</h3>

      <div class="occupancy-table-wrap">
        <table class="occupancy-table">
          <thead>
            <tr>
              <th>Floor Number</th>
              <th>Floor Name</th>
              <th>Total Slots</th>
              <th>Occupied</th>
              <th>Open</th>
            </tr>
          </thead>

          <tbody>
            <?php while ($row = $floorStmt->fetch()): ?>
              <tr>
                <td><?= htmlspecialchars($row['floor_number']) ?></td>
                <td><?= htmlspecialchars($row['name']) ?></td>
                <td><?= htmlspecialchars($row['total_slots']) ?></td>
                <td><?= htmlspecialchars($row['occupied_slots']) ?></td>
                <td><?= htmlspecialchars($row['open_slots']) ?></td>
              </tr>
            <?php endwhile; ?>
          </tbody>

        </table>
      </div>

    </div>
  </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>