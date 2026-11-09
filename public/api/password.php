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

require_auth();
check_csrf();

$body = json_body();
$current = (string)($body['current_password'] ?? '');
$password = (string)($body['new_password'] ?? $body['password'] ?? '');
$confirm = (string)($body['confirm_password'] ?? '');

if ($current === '') {
    json_out(['error' => 'Current password is required'], 400);
}
if ($password === '') {
    json_out(['error' => 'New password is required'], 400);
}
if (strlen($password) < 8) {
    json_out(['error' => 'New password must be at least 8 characters long'], 400);
}
if ($confirm !== '' && $confirm !== $password) {
    json_out(['error' => 'New passwords do not match'], 400);
}

start_session();
$id = (int)($_SESSION['uid'] ?? 0);
$stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
$stmt->execute([$id]);
$user = $stmt->fetch();
if (!$user) {
    json_out(['error' => 'User not found'], 404);
}
if (!password_verify($current, $user['password_hash'])) {
    json_out(['error' => 'Current password is incorrect'], 401);
}
$hash = password_hash($password, PASSWORD_DEFAULT);
$upd = db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$upd->execute([$hash, $id]);
if ($upd->rowCount() < 1) {
    json_out(['error' => 'Password update failed'], 500);
}

// Rotate the session id so other tabs / hijacked sessions don't stay valid.
if (session_status() === PHP_SESSION_ACTIVE) {
    session_regenerate_id(true);
}

json_out(['ok' => true, 'message' => 'Password changed successfully']);
