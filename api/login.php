<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

try {
    auto_install_if_needed();
} catch (Throwable $e) {
    json_out(['error' => 'Database not ready: ' . $e->getMessage()], 500);
}

$body = json_body();
$username = trim((string)($body['username'] ?? ''));
$password = (string)($body['password'] ?? '');

if ($username === '' || $password === '') {
    json_out(['error' => 'Username and password required'], 400);
}

$stmt = db()->prepare('SELECT id, username, password_hash FROM users WHERE username = ?');
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    usleep(300000);
    json_out(['error' => 'Invalid username or password'], 401);
}

start_session();
session_regenerate_id(true);
$_SESSION['uid'] = (int)$user['id'];
$_SESSION['username'] = $user['username'];

json_out(['ok' => true, 'username' => $user['username'], 'csrf' => csrf_token()]);
