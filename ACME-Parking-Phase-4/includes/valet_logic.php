<?php

function normalize_license_plate(string $licensePlate): string
{
    return strtoupper(trim($licensePlate));
}

function validate_license_plate(string $licensePlate): string
{
    $licensePlate = normalize_license_plate($licensePlate);

    if ($licensePlate === '') {
        throw new Exception('License plate is required.');
    }

    return $licensePlate;
}

function is_car_wash_eligible_now(): bool
{
    $currentTime = date('H:i:s');
    return $currentTime >= '08:00:00' && $currentTime <= '16:00:00';
}

function calculate_car_wash_fee(int $carWashRequested, int $washEligible): float
{
    return ($carWashRequested === 1 && $washEligible === 1) ? 30.00 : 0.00;
}

function calculate_checkout_totals(array $slip): array
{
    $entryTime = new DateTime($slip['entry_time']);
    $exitTime = new DateTime();

    $seconds = $exitTime->getTimestamp() - $entryTime->getTimestamp();
    $minutes = max(1, (int)ceil($seconds / 60));
    $hoursToCharge = max(1, (int)ceil($minutes / 60));

    $hourlyRate = (float)$slip['hourly_rate'];
    $parkingFee = $hoursToCharge * $hourlyRate;
    $carWashFee = (float)$slip['car_wash_fee'];
    $totalDue = $parkingFee + $carWashFee;

    return [
        'entry_time' => $entryTime->format('Y-m-d H:i:s'),
        'exit_time' => $exitTime->format('Y-m-d H:i:s'),
        'minutes_parked' => $minutes,
        'hours_to_charge' => $hoursToCharge,
        'parking_fee' => $parkingFee,
        'car_wash_fee' => $carWashFee,
        'total_due' => $totalDue
    ];
}