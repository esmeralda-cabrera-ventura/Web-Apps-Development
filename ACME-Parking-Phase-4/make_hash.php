<?php
echo "ADMIN: " . password_hash("Admin123!", PASSWORD_BCRYPT) . "<br>";
echo "VALET: " . password_hash("Valet123!", PASSWORD_BCRYPT) . "<br>";
echo "ATTENDANT: " . password_hash("Attend123!", PASSWORD_BCRYPT) . "<br>";
?>