<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

try {
    auto_install_if_needed();
} catch (Throwable $e) {
    json_out(['error' => 'Database not ready: ' . $e->getMessage()], 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function generate_invite_code(): string
{
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $part1 = '';
    $part2 = '';
    for ($i = 0; $i < 4; $i++) {
        $part1 .= $chars[random_int(0, strlen($chars) - 1)];
        $part2 .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return 'AW-' . $part1 . $part2;
}

if ($method === 'GET') {
    $code = strtoupper(trim((string)($_GET['code'] ?? '')));

    // Public verification lookup by code
    if ($code !== '') {
        // Normalize code: allow both AW-XXXXYYYY and XXXXYYYY
        $clean = preg_replace('/[^A-Z0-9]/', '', $code);
        if (strpos($clean, 'AW') === 0 && strlen($clean) > 4) {
            $normalized = 'AW-' . substr($clean, 2);
        } else {
            $normalized = 'AW-' . $clean;
        }

        $stmt = db()->prepare('SELECT id, code, name, max_guests, table_no, note, opened_at FROM invited_guests WHERE UPPER(code) = ? OR UPPER(REPLACE(code, "-", "")) = ? LIMIT 1');
        $stmt->execute([$normalized, $clean]);
        $guest = $stmt->fetch();

        if (!$guest) {
            usleep(200000);
            json_out(['ok' => false, 'error' => 'Invalid invitation code. Please check your personal link or invitation code.'], 404);
        }

        // Record first open timestamp
        if (empty($guest['opened_at'])) {
            try {
                db()->prepare('UPDATE invited_guests SET opened_at = ? WHERE id = ?')->execute([gmdate('Y-m-d H:i:s'), $guest['id']]);
                $guest['opened_at'] = gmdate('Y-m-d H:i:s');
            } catch (Throwable $e) {}
        }

        json_out(['ok' => true, 'guest' => $guest]);
    }

    // Admin list of all invited guests
    require_auth();
    $rows = db()->query('SELECT * FROM invited_guests ORDER BY id DESC')->fetchAll();
    json_out(['ok' => true, 'guests' => $rows]);
}

if ($method === 'POST') {
    require_auth();
    check_csrf();
    $body = json_body();
    $action = (string)($body['action'] ?? ($_GET['action'] ?? 'create'));

    if ($action === 'delete') {
        $id = (int)($body['id'] ?? ($_GET['id'] ?? 0));
        if ($id <= 0) {
            json_out(['error' => 'Invalid guest id'], 400);
        }
        db()->prepare('DELETE FROM invited_guests WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    if ($action === 'clear_all') {
        db()->exec('DELETE FROM invited_guests');
        json_out(['ok' => true]);
    }

    $name = trim((string)($body['name'] ?? ''));
    $phone = trim((string)($body['phone'] ?? ''));
    $maxGuests = max(1, (int)($body['max_guests'] ?? 1));
    $tableNo = trim((string)($body['table_no'] ?? ''));
    $note = trim((string)($body['note'] ?? ''));

    if ($name === '') {
        json_out(['error' => 'Guest name is required'], 400);
    }

    // Generate unique code
    $code = '';
    for ($attempt = 0; $attempt < 10; $attempt++) {
        $candidate = generate_invite_code();
        $chk = db()->prepare('SELECT COUNT(*) FROM invited_guests WHERE code = ?');
        $chk->execute([$candidate]);
        if ((int)$chk->fetchColumn() === 0) {
            $code = $candidate;
            break;
        }
    }
    if ($code === '') {
        $code = 'AW-' . strtoupper(bin2hex(random_bytes(4)));
    }

    $now = gmdate('Y-m-d H:i:s');
    $stmt = db()->prepare('INSERT INTO invited_guests (code, name, phone, max_guests, table_no, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$code, $name, $phone, $maxGuests, $tableNo, $note, $now]);
    $id = (int)db()->lastInsertId();

    $guest = [
        'id' => $id,
        'code' => $code,
        'name' => $name,
        'phone' => $phone,
        'max_guests' => $maxGuests,
        'table_no' => $tableNo,
        'note' => $note,
        'opened_at' => null,
        'created_at' => $now,
    ];

    json_out(['ok' => true, 'guest' => $guest]);
}

if ($method === 'DELETE') {
    require_auth();
    check_csrf();
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        json_out(['error' => 'Missing id'], 400);
    }
    db()->prepare('DELETE FROM invited_guests WHERE id = ?')->execute([$id]);
    json_out(['ok' => true]);
}

json_out(['error' => 'Method not allowed'], 405);
