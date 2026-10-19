<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    auto_install_if_needed();

    if ($method === 'GET') {
        $row = db()->query('SELECT data FROM content WHERE id = 1')->fetch();
        $stored = ($row && $row['data']) ? (json_decode($row['data'], true) ?: []) : [];
        // Always serve the seed as the base so every required section exists,
        // even if the stored copy is partial or was overwritten with test data.
        $out = deep_merge(seed_content(), is_array($stored) ? $stored : []);
        json_out($out ?: new stdClass());
    }

    if ($method === 'POST' || $method === 'PUT') {
        require_auth();
        check_csrf();
        $data = json_body();
        if (!is_array($data) || !$data) {
            json_out(['error' => 'Empty or invalid content'], 400);
        }
        $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            json_out(['error' => 'Content could not be encoded'], 400);
        }
        $now = gmdate('Y-m-d H:i:s');
        $exists = db()->query('SELECT COUNT(*) FROM content WHERE id = 1')->fetchColumn();
        if ($exists) {
            $stmt = db()->prepare('UPDATE content SET data = ?, updated_at = ? WHERE id = 1');
            $stmt->execute([$json, $now]);
        } else {
            $stmt = db()->prepare('INSERT INTO content (id, data, updated_at) VALUES (1, ?, ?)');
            $stmt->execute([$json, $now]);
        }
        json_out(['ok' => true, 'updated_at' => $now]);
    }

    json_out(['error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    if ($method === 'GET') {
        $seed = @file_get_contents(__DIR__ . '/../content.json');
        if ($seed !== false) {
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Source: static-fallback');
            echo $seed;
            exit;
        }
    }
    json_out(['error' => 'Server error: ' . $e->getMessage()], 500);
}
