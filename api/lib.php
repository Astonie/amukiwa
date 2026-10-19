<?php
declare(strict_types=1);

// Shared helpers for the wedding API.

function cfg(): array
{
    static $cfg = null;
    if ($cfg === null) {
        $cfg = require __DIR__ . '/config.php';
    }
    return $cfg;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }
    $c = cfg();
    if (($c['driver'] ?? 'mysql') === 'sqlite') {
        $path = $c['sqlite_path'];
        if (!is_dir(dirname($path))) {
            @mkdir(dirname($path), 0775, true);
        }
        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');
    } else {
        $dsn = 'mysql:host=' . $c['host'] . ';dbname=' . $c['name'] . ';charset=utf8mb4';
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function json_out($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) {
        return $_POST ?: [];
    }
    $data = json_decode($raw, true);
    if (is_array($data)) {
        return $data;
    }
    return $_POST ?: [];
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
    ]);
    session_start();
}

function is_authed(): bool
{
    start_session();
    return !empty($_SESSION['uid']);
}

function require_auth(): void
{
    if (!is_authed()) {
        json_out(['error' => 'Not authenticated'], 401);
    }
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

function check_csrf(): void
{
    start_session();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['csrf'] ?? '');
    if (empty($_SESSION['csrf']) || !hash_equals($_SESSION['csrf'], (string)$sent)) {
        json_out(['error' => 'Invalid or missing CSRF token'], 403);
    }
}

function table_exists(string $table): bool
{
    $c = cfg();
    try {
        if (($c['driver'] ?? 'mysql') === 'sqlite') {
            $r = db()->query("SELECT name FROM sqlite_master WHERE type='table' AND name=" . db()->quote($table))->fetch();
            return (bool)$r;
        }
        $r = db()->prepare('SHOW TABLES LIKE ?');
        $r->execute([$table]);
        return (bool)$r->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

function auto_install_if_needed(): void
{
    // Convenience: create tables on first request so the site never 500s.
    if (table_exists('content') && table_exists('users')) {
        return;
    }
    require_once __DIR__ . '/install_lib.php';
    wedding_install_schema();
    if (!table_exists('users') || (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn() === 0) {
        create_default_admin();
    }
    if ((int)db()->query('SELECT COUNT(*) FROM content')->fetchColumn() === 0) {
        seed_content_from_json();
    }
}

function create_default_admin(string $username = 'admin', string $password = 'admin'): void
{
    $stmt = db()->prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)');
    $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT), gmdate('Y-m-d H:i:s')]);
}

function seed_content_from_json(): void
{
    $file = __DIR__ . '/../content.json';
    $json = is_file($file) ? file_get_contents($file) : '{}';
    $data = json_decode($json, true);
    if (!is_array($data)) {
        $data = [];
    }
    $stmt = db()->prepare('INSERT INTO content (id, data, updated_at) VALUES (1, ?, ?)');
    $stmt->execute([json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), gmdate('Y-m-d H:i:s')]);
}
