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
    $note = trim((string)($body['note'] ?? ''));

    if ($name === '' || $note === '') {
        json_out(['error' => 'Name and message are required'], 400);
    }

    $stmt = db()->prepare('INSERT INTO guestbook (name, note, created_at) VALUES (?, ?, ?)');
    $stmt->execute([$name, $note, gmdate('Y-m-d H:i:s')]);
    json_out(['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if ($method === 'GET') {
    require_auth();
    try {
        auto_install_if_needed();
        $stmt = db()->query('SELECT * FROM guestbook ORDER BY id DESC');
        json_out(['ok' => true, 'guestbook' => $stmt->fetchAll()]);
    } catch (Throwable $e) {
        json_out(['error' => 'Server error: ' . $e->getMessage()], 500);
    }
}

json_out(['error' => 'Method not allowed'], 405);
