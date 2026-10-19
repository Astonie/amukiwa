<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

try {
    auto_install_if_needed();
} catch (Throwable $e) {
    json_out(['error' => 'Database not ready: ' . $e->getMessage()], 500);
}

require_auth();
check_csrf();

$body = json_body();
$current = (string)($body['current_password'] ?? '');
$password = (string)($body['password'] ?? '');

if ($password === '') {
    json_out(['error' => 'New password is required'], 400);
}

start_session();
$id = (int)($_SESSION['uid'] ?? 0);
$stmt = db()->prepare('SELECT password_hash FROM users WHERE id = ?');
$stmt->execute([$id]);
$user = $stmt->fetch();
if (!$user) {
    json_out(['error' => 'User not found'], 404);
}
if ($current !== '' && !password_verify($current, $user['password_hash'])) {
    json_out(['error' => 'Current password is incorrect'], 401);
}
$hash = password_hash($password, PASSWORD_DEFAULT);
db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, $id]);

json_out(['ok' => true]);
