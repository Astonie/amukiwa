<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/install_lib.php';

header('Content-Type: text/plain; charset=utf-8');

$lock = __DIR__ . '/.installed';
$force = isset($_GET['force']);

try {
    if (is_file($lock) && !$force) {
        echo "Already installed.\nTo re-run, add ?force=1 (this will NOT delete data, only re-create tables if missing).\n";
        exit;
    }

    $body = json_body();
    $username = trim((string)($_GET['user'] ?? $body['username'] ?? 'admin'));
    $password = (string)($_GET['pass'] ?? $body['password'] ?? 'admin');

    echo "Installing schema...\n";
    wedding_install_schema();

    $count = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
    if ($count === 0) {
        create_default_admin($username, $password);
        echo "Created admin user: {$username}\n";
        if ($password === 'admin') {
            echo "!! Default password is 'admin' — change it in the admin panel Settings right after logging in.\n";
        }
    } else {
        echo "Admin user already exists (skipped).\n";
    }

    $hasContent = (int)db()->query('SELECT COUNT(*) FROM content')->fetchColumn() > 0;
    if (!$hasContent) {
        seed_content_from_json();
        echo "Seeded content from content.json.\n";
    } else {
        echo "Content row already exists (skipped).\n";
    }

    $up = cfg()['upload_dir'];
    if (!is_dir($up)) {
        @mkdir($up, 0775, true);
    }
    if (is_dir($up) && is_writable($up)) {
        echo "Uploads directory: {$up} (writable)\n";
    } else {
        echo "!! Uploads directory is NOT writable: {$up}\n";
    }

    file_put_contents($lock, gmdate('c'));
    echo "\nDone. Delete this file (api/install.php) from your server for security.\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo 'Install failed: ' . $e->getMessage() . "\n";
    echo "Check api/config.php database credentials.\n";
}
