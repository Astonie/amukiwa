<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

try {
    auto_install_if_needed();
} catch (Throwable $e) {
    json_out(['authed' => false, 'db' => false, 'error' => $e->getMessage()]);
}

$authed = is_authed();
$out = ['authed' => $authed, 'db' => true];
if ($authed) {
    $out['username'] = $_SESSION['username'] ?? '';
    $out['role'] = $_SESSION['role'] ?? 'admin';
    $out['csrf'] = csrf_token();
}
json_out($out);
