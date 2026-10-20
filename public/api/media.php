<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    auto_install_if_needed();

    if ($method === 'GET') {
        $kind = $_GET['kind'] ?? '';
        if ($kind === 'image' || $kind === 'audio') {
            $stmt = db()->prepare('SELECT id, filename, url, mime, kind, size, created_at FROM media WHERE kind = ? ORDER BY id DESC');
            $stmt->execute([$kind]);
        } else {
            $stmt = db()->query('SELECT id, filename, url, mime, kind, size, created_at FROM media ORDER BY id DESC');
        }
        json_out(['ok' => true, 'media' => $stmt->fetchAll()]);
    }

    if ($method === 'DELETE' || $method === 'POST') {
        require_auth();
        check_csrf();
        $body = json_body();
        $id = (int)($body['id'] ?? ($_GET['id'] ?? 0));
        if ($id <= 0) {
            json_out(['error' => 'Missing id'], 400);
        }
        $stmt = db()->prepare('SELECT filename FROM media WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            json_out(['error' => 'Not found'], 404);
        }
        $path = rtrim(cfg()['upload_dir'], '/') . '/' . $row['filename'];
        if (is_file($path)) {
            @unlink($path);
        }
        db()->prepare('DELETE FROM media WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    json_out(['error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    json_out(['error' => 'Server error: ' . $e->getMessage()], 500);
}
