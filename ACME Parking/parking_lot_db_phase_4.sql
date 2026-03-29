-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 29, 2026 at 09:36 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `parking_lot_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `customer`
--

CREATE TABLE `customer` (
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `first_name` varchar(80) NOT NULL,
  `last_name` varchar(80) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `license_plate` varchar(20) NOT NULL,
  `vehicle_make` varchar(60) DEFAULT NULL,
  `vehicle_model` varchar(60) DEFAULT NULL,
  `vehicle_color` varchar(40) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `floor`
--

CREATE TABLE `floor` (
  `floor_id` bigint(20) UNSIGNED NOT NULL,
  `parking_lot_id` bigint(20) UNSIGNED NOT NULL,
  `floor_number` int(11) NOT NULL,
  `name` varchar(80) DEFAULT NULL,
  `is_valet_only` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `floor`
--

INSERT INTO `floor` (`floor_id`, `parking_lot_id`, `floor_number`, `name`, `is_valet_only`) VALUES
(1, 1, 1, 'Level 1', 1),
(2, 1, 2, 'Level 2', 0),
(3, 1, 3, 'Level 3', 0);

-- --------------------------------------------------------

--
-- Table structure for table `parkinglot`
--

CREATE TABLE `parkinglot` (
  `parking_lot_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(120) NOT NULL,
  `address_line1` varchar(200) NOT NULL,
  `city` varchar(80) NOT NULL,
  `state` varchar(40) NOT NULL,
  `postal_code` varchar(20) NOT NULL,
  `timezone` varchar(60) NOT NULL DEFAULT 'America/Los_Angeles',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parkinglot`
--

INSERT INTO `parkinglot` (`parking_lot_id`, `name`, `address_line1`, `city`, `state`, `postal_code`, `timezone`, `created_at`) VALUES
(1, 'ACME Parking Garage', '123 Main St', 'San Diego', 'CA', '92123', 'America/Los_Angeles', '2026-03-15 00:56:49');

-- --------------------------------------------------------

--
-- Table structure for table `parkingslip`
--

CREATE TABLE `parkingslip` (
  `parking_slip_id` bigint(20) UNSIGNED NOT NULL,
  `parking_lot_id` bigint(20) UNSIGNED NOT NULL,
  `parking_slot_id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `license_plate` varchar(20) NOT NULL,
  `entry_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `exit_time` timestamp NULL DEFAULT NULL,
  `hourly_rate` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `status` enum('ACTIVE','CLOSED','LOST') NOT NULL DEFAULT 'ACTIVE',
  `active_slot_id` bigint(20) UNSIGNED GENERATED ALWAYS AS (case when `status` = 'ACTIVE' then `parking_slot_id` else NULL end) STORED,
  `is_valet` tinyint(1) NOT NULL DEFAULT 0,
  `car_wash_requested` tinyint(1) NOT NULL DEFAULT 0,
  `car_wash_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `wash_eligible` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parkingslip`
--

INSERT INTO `parkingslip` (`parking_slip_id`, `parking_lot_id`, `parking_slot_id`, `customer_id`, `license_plate`, `entry_time`, `exit_time`, `hourly_rate`, `total_amount`, `status`, `is_valet`, `car_wash_requested`, `car_wash_fee`, `wash_eligible`) VALUES
(1, 1, 12, NULL, 'ABC123', '2026-03-15 01:35:03', '2026-03-15 01:42:16', 1.00, 9.00, 'CLOSED', 0, 0, 0.00, 0),
(2, 1, 10, NULL, 'TEST999', '2026-03-15 01:56:31', '2026-03-15 02:09:15', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(3, 1, 12, NULL, 'AAA101', '2026-03-15 03:27:42', '2026-03-15 03:35:40', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(4, 1, 4, NULL, 'AAA101', '2026-03-15 03:27:50', '2026-03-15 03:32:57', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(5, 1, 10, NULL, 'BBB202', '2026-03-15 03:27:59', '2026-03-15 03:33:33', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(6, 1, 5, NULL, 'CCC303', '2026-03-15 03:28:06', '2026-03-15 03:33:57', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(7, 1, 3, NULL, 'DDD404', '2026-03-15 03:28:15', '2026-03-15 03:36:22', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(8, 1, 7, NULL, 'EEE505', '2026-03-15 03:28:25', '2026-03-15 03:34:28', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(9, 1, 6, NULL, 'GGG707', '2026-03-15 03:28:37', '2026-03-15 03:36:47', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(10, 1, 9, NULL, 'GGG707', '2026-03-15 03:28:46', '2026-03-15 03:33:11', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(11, 1, 11, NULL, 'HHH808', '2026-03-15 03:28:54', '2026-03-15 03:34:48', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(12, 1, 2, NULL, 'JJJ111', '2026-03-15 03:29:03', '2026-03-15 03:35:13', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(13, 1, 8, NULL, 'KKK222', '2026-03-15 03:29:47', '2026-03-15 03:40:09', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(14, 1, 1, NULL, 'KKK222', '2026-03-15 03:29:58', '2026-03-15 03:33:18', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(15, 1, 2, NULL, 'ABCDE', '2026-03-24 07:29:08', '2026-03-24 07:32:10', 1.00, 1.00, 'CLOSED', 1, 0, 0.00, 0),
(16, 1, 1, NULL, 'ABCDE', '2026-03-24 07:44:49', '2026-03-24 07:45:44', 1.00, 1.00, 'CLOSED', 1, 0, 0.00, 0),
(17, 1, 6, NULL, 'ABCDE', '2026-03-24 07:56:53', '2026-03-24 07:58:01', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(18, 1, 2, NULL, 'ABCDE', '2026-03-24 09:04:47', '2026-03-24 09:07:44', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(19, 1, 1, NULL, 'ABCDE', '2026-03-29 05:31:43', '2026-03-29 05:35:06', 1.00, 1.00, 'CLOSED', 1, 0, 0.00, 0),
(20, 1, 3, NULL, 'ABCDE', '2026-03-29 05:34:28', '2026-03-29 05:44:49', 1.00, 1.00, 'CLOSED', 1, 0, 0.00, 0),
(21, 1, 4, NULL, 'ABCDE', '2026-03-29 05:47:41', '2026-03-29 05:48:01', 1.00, 1.00, 'CLOSED', 1, 0, 0.00, 0),
(22, 1, 12, NULL, 'ABCDE', '2026-03-29 05:48:31', '2026-03-29 05:49:06', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(23, 1, 2, NULL, 'ABCDE', '2026-03-29 05:49:50', '2026-03-29 05:49:59', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0),
(24, 1, 2, NULL, 'ABCDE', '2026-03-29 05:52:19', '2026-03-29 05:55:55', 1.00, 1.00, 'CLOSED', 1, 0, 0.00, 0),
(25, 1, 3, NULL, 'ABCDE', '2026-03-29 05:57:20', '2026-03-29 06:04:26', 1.00, 1.00, 'CLOSED', 1, 0, 0.00, 0),
(26, 1, 1, NULL, 'ABCDE', '2026-03-29 06:06:20', '2026-03-29 06:07:38', 1.00, 1.00, 'CLOSED', 1, 0, 0.00, 0),
(27, 1, 8, NULL, 'AAA101', '2026-03-29 06:32:17', '2026-03-29 06:38:18', 1.00, 1.00, 'CLOSED', 0, 0, 0.00, 0);

-- --------------------------------------------------------

--
-- Table structure for table `parkingslot`
--

CREATE TABLE `parkingslot` (
  `parking_slot_id` bigint(20) UNSIGNED NOT NULL,
  `floor_id` bigint(20) UNSIGNED NOT NULL,
  `slot_label` varchar(20) NOT NULL,
  `slot_type` enum('STANDARD','COMPACT','EV','HANDICAP','RESERVED') NOT NULL DEFAULT 'STANDARD',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_occupied` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `parkingslot`
--

INSERT INTO `parkingslot` (`parking_slot_id`, `floor_id`, `slot_label`, `slot_type`, `is_active`, `is_occupied`) VALUES
(1, 1, 'A1', 'STANDARD', 1, 0),
(2, 1, 'A2', 'STANDARD', 1, 0),
(3, 1, 'A3', 'STANDARD', 1, 0),
(4, 1, 'A4', 'STANDARD', 1, 0),
(5, 2, 'B1', 'STANDARD', 1, 0),
(6, 2, 'B2', 'STANDARD', 1, 0),
(7, 2, 'B3', 'STANDARD', 1, 0),
(8, 2, 'B4', 'STANDARD', 1, 0),
(9, 3, 'C1', 'STANDARD', 1, 0),
(10, 3, 'C2', 'STANDARD', 1, 0),
(11, 3, 'C3', 'STANDARD', 1, 0),
(12, 3, 'C4', 'STANDARD', 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `useroperator`
--

CREATE TABLE `useroperator` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(120) NOT NULL,
  `role` enum('ADMIN','OPERATOR','VALET','ATTENDANT') NOT NULL DEFAULT 'OPERATOR',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `useroperator`
--

INSERT INTO `useroperator` (`user_id`, `username`, `password_hash`, `full_name`, `email`, `role`, `is_active`, `created_at`) VALUES
(1, 'admin', '$2y$10$uFADai2QNMizgzR9Adt7seHxoRBbLMeSlYzQf2NLpJOlvoSbzn9CC', 'System Admin', 'admin@acmeparking.local', 'ADMIN', 1, '2026-03-05 06:08:47'),
(8, 'valet', '$2y$10$dNbxIFb1LUKjiWFT7bqmR.U.tg0pR.M0AmHA6Cwobn1yRbFJR1vy.', 'Valet Acme', 'valet@acme.com', 'VALET', 1, '2026-03-24 08:38:23'),
(9, 'attendant', '$2y$10$5GHDW80S5nOqCmDFJf7ImeUZIVLBErOiKjQNGQA21MGwvTP4rcAf6', 'Attendant Acme', 'attendant@acme.com', 'ATTENDANT', 1, '2026-03-24 08:39:58');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ATTENDANT','VALET','ADMIN') NOT NULL DEFAULT 'ATTENDANT',
  `full_name` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `customer`
--
ALTER TABLE `customer`
  ADD PRIMARY KEY (`customer_id`),
  ADD UNIQUE KEY `uq_vehicle_plate` (`license_plate`),
  ADD UNIQUE KEY `uq_customer_email` (`email`);

--
-- Indexes for table `floor`
--
ALTER TABLE `floor`
  ADD PRIMARY KEY (`floor_id`),
  ADD UNIQUE KEY `uq_floor_per_lot` (`parking_lot_id`,`floor_number`);

--
-- Indexes for table `parkinglot`
--
ALTER TABLE `parkinglot`
  ADD PRIMARY KEY (`parking_lot_id`),
  ADD UNIQUE KEY `uq_parkinglot_name_address` (`name`,`address_line1`,`city`,`state`,`postal_code`);

--
-- Indexes for table `parkingslip`
--
ALTER TABLE `parkingslip`
  ADD PRIMARY KEY (`parking_slip_id`),
  ADD UNIQUE KEY `uq_one_active_per_slot` (`active_slot_id`),
  ADD KEY `fk_slip_slot` (`parking_slot_id`),
  ADD KEY `fk_slip_customer` (`customer_id`),
  ADD KEY `idx_slip_lot_time` (`parking_lot_id`,`entry_time`),
  ADD KEY `idx_slip_plate` (`license_plate`);

--
-- Indexes for table `parkingslot`
--
ALTER TABLE `parkingslot`
  ADD PRIMARY KEY (`parking_slot_id`),
  ADD UNIQUE KEY `uq_slot_per_floor` (`floor_id`,`slot_label`),
  ADD KEY `idx_slot_floor_type` (`floor_id`,`slot_type`);

--
-- Indexes for table `useroperator`
--
ALTER TABLE `useroperator`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uq_useroperator_username` (`username`),
  ADD UNIQUE KEY `uq_useroperator_email` (`email`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uq_username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `customer`
--
ALTER TABLE `customer`
  MODIFY `customer_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `floor`
--
ALTER TABLE `floor`
  MODIFY `floor_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `parkinglot`
--
ALTER TABLE `parkinglot`
  MODIFY `parking_lot_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `parkingslip`
--
ALTER TABLE `parkingslip`
  MODIFY `parking_slip_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `parkingslot`
--
ALTER TABLE `parkingslot`
  MODIFY `parking_slot_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `useroperator`
--
ALTER TABLE `useroperator`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `floor`
--
ALTER TABLE `floor`
  ADD CONSTRAINT `fk_floor_lot` FOREIGN KEY (`parking_lot_id`) REFERENCES `parkinglot` (`parking_lot_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `parkingslip`
--
ALTER TABLE `parkingslip`
  ADD CONSTRAINT `fk_slip_customer` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`customer_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_slip_lot` FOREIGN KEY (`parking_lot_id`) REFERENCES `parkinglot` (`parking_lot_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_slip_slot` FOREIGN KEY (`parking_slot_id`) REFERENCES `parkingslot` (`parking_slot_id`) ON UPDATE CASCADE;

--
-- Constraints for table `parkingslot`
--
ALTER TABLE `parkingslot`
  ADD CONSTRAINT `fk_slot_floor` FOREIGN KEY (`floor_id`) REFERENCES `floor` (`floor_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
