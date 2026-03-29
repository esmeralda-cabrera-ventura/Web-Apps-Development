<?php
session_start();
session_unset();
session_destroy();
header("Location: /acme_parking_phase_4/index.php");
exit;