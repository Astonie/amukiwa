<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';

if ($method === 'POST') {
    try {
        auto_install_if_needed();
    } catch (Throwable $e) {
        json_out(['error' => 'Database not ready: ' . $e->getMessage()], 500);
    }

    $body = json_body();
    $first = trim((string)($body['first'] ?? ''));
    $last = trim((string)($body['last'] ?? ''));
    $name = trim((string)($body['name'] ?? ''));
    if ($name === '') $name = trim($first . ' ' . $last);
    $email = trim((string)($body['email'] ?? ''));
    $phone = trim((string)($body['phone'] ?? ''));
    $guests = (int)($body['guests'] ?? 1);
    $attend = (string)($body['attend'] ?? $body['attending'] ?? 'yes');
    $attending = in_array($attend, ['yes', 'no', 'maybe'], true) ? $attend : 'yes';
    $diet = trim((string)($body['diet'] ?? ''));
    $message = trim((string)($body['msg'] ?? $body['message'] ?? ''));

    if ($name === '') {
        json_out(['error' => 'Name is required'], 400);
    }
    if ($guests < 1) {
        $guests = 1;
    }

    $stmt = db()->prepare('INSERT INTO rsvps (first, last, name, email, phone, guests, attending, diet, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$first, $last, $name, $email, $phone, $guests, $attending, $diet, $message, gmdate('Y-m-d H:i:s')]);
    json_out(['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if ($method === 'GET') {
    require_auth();
    try {
        auto_install_if_needed();
        $stmt = db()->query('SELECT * FROM rsvps ORDER BY id DESC');
        $rows = $stmt->fetchAll();
        json_out(['ok' => true, 'rsvp' => $rows, 'rsvps' => $rows]);
    } catch (Throwable $e) {
        json_out(['error' => 'Server error: ' . $e->getMessage()], 500);
    }
}

json_out(['error' => 'Method not allowed'], 405);
