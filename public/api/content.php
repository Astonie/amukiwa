<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    auto_install_if_needed();
    $cacheFile = __DIR__ . '/../data/content.cache.json';

    if ($method === 'GET') {
        $cacheFile = __DIR__ . '/../data/content.cache.json';
        $ttl = 60;
        if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $ttl) {
            $cached = @file_get_contents($cacheFile);
            if ($cached !== false) {
                header('Content-Type: application/json; charset=utf-8');
                header('X-Content-Source: cache');
                echo $cached;
                exit;
            }
        }
        $out = content_from_tables();
        if (!is_array($out) || empty($out)) {
            $row = db()->query('SELECT data FROM content WHERE id = 1')->fetch();
            $stored = ($row && $row['data']) ? (json_decode($row['data'], true) ?: []) : [];
            $out = deep_merge(seed_content(), is_array($stored) ? $stored : []);
        } else {
            // merge with seed to ensure required sections exist
            $out = deep_merge(seed_content(), $out);
        }
        if (isset($out) && is_array($out)) {
            @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        }
        json_out($out ?: new stdClass());
    }

    if ($method === 'POST' || $method === 'PUT') {
        require_auth();
        check_csrf();
        $data = json_body();
        if (!is_array($data) || !$data) {
            json_out(['error' => 'Empty or invalid content'], 400);
        }
        // Optimistic concurrency check
        $baseUpdated = $data['updated_at'] ?? ($_SERVER['HTTP_IF_MATCH'] ?? null);
        unset($data['updated_at']);
        if ($baseUpdated !== null) {
            $storedUpdated = db()->query('SELECT updated_at FROM site_settings WHERE id = 1')->fetchColumn();
            if ($storedUpdated !== false && $storedUpdated !== null && (string)$storedUpdated !== (string)$baseUpdated) {
                json_out(['error' => 'Conflict: content changed since you loaded it. Reload and retry.', 'current_updated_at' => $storedUpdated], 409);
            }
        }
        // Save to normalized tables (proper DB tables)
        save_content_to_tables($data);
        // Audit log
        try {
            start_session();
            $u = $_SESSION['username'] ?? 'unknown';
            $stmt = db()->prepare('INSERT INTO audit_log (username, action, entity, details, created_at) VALUES (?,?,?,?,?)');
            $stmt->execute([$u, 'update', 'content', json_encode(['keys' => array_keys($data)]), gmdate('Y-m-d H:i:s')]);
        } catch (Throwable $e) {}
        // Keep legacy content table in sync
        try {
            $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $now = gmdate('Y-m-d H:i:s');
            $exists = db()->query('SELECT COUNT(*) FROM content WHERE id = 1')->fetchColumn();
            if ($exists) {
                $stmt = db()->prepare('UPDATE content SET data = ?, updated_at = ? WHERE id = 1');
                $stmt->execute([$json, $now]);
            } else {
                $stmt = db()->prepare('INSERT INTO content (id, data, updated_at) VALUES (1, ?, ?)');
                $stmt->execute([$json, $now]);
            }
        } catch (Throwable $e) {}
        $newUpdated = db()->query('SELECT updated_at FROM site_settings WHERE id = 1')->fetchColumn();
        @unlink($cacheFile);
        json_out(['ok' => true, 'updated_at' => $newUpdated]);
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
