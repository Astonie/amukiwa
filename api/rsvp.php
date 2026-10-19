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
    $name = trim((string)($body['name'] ?? ''));
    $email = trim((string)($body['email'] ?? ''));
    $phone = trim((string)($body['phone'] ?? ''));
    $guests = (int)($body['guests'] ?? 1);
    $attending = in_array((string)($body['attending'] ?? 'yes'), ['yes', 'no', 'maybe'], true) ? (string)$body['attending'] : 'yes';
    $message = trim((string)($body['message'] ?? ''));

    if ($name === '') {
        json_out(['error' => 'Name is required'], 400);
    }
    if ($guests < 1) {
        $guests = 1;
    }

    $stmt = db()->prepare('INSERT INTO rsvps (name, email, phone, guests, attending, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$name, $email, $phone, $guests, $attending, $message, gmdate('Y-m-d H:i:s')]);
    json_out(['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if ($method === 'GET') {
    require_auth();
    try {
        auto_install_if_needed();
        $stmt = db()->query('SELECT * FROM rsvps ORDER BY id DESC');
        json_out(['ok' => true, 'rsvps' => $stmt->fetchAll()]);
    } catch (Throwable $e) {
        json_out(['error' => 'Server error: ' . $e->getMessage()], 500);
    }
}

json_out(['error' => 'Method not allowed'], 405);
