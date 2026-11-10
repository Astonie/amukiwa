<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

try {
    auto_install_if_needed();
} catch (Throwable $e) {
    json_out(['error' => 'Database not ready: ' . $e->getMessage()], 500);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $category = trim((string)($_GET['category'] ?? ''));
    $includePending = !empty($_GET['all']) && is_authed();

    try {
        if ($includePending) {
            if ($category !== '' && strtolower($category) !== 'all') {
                $stmt = db()->prepare('SELECT * FROM album_photos WHERE category = ? ORDER BY id DESC LIMIT 500');
                $stmt->execute([$category]);
            } else {
                $stmt = db()->query('SELECT * FROM album_photos ORDER BY id DESC LIMIT 500');
            }
        } else {
            if ($category !== '' && strtolower($category) !== 'all') {
                $stmt = db()->prepare('SELECT * FROM album_photos WHERE approved = 1 AND category = ? ORDER BY id DESC LIMIT 500');
                $stmt->execute([$category]);
            } else {
                $stmt = db()->query('SELECT * FROM album_photos WHERE approved = 1 ORDER BY id DESC LIMIT 500');
            }
        }
        $rows = $stmt->fetchAll();
        json_out(['ok' => true, 'photos' => $rows]);
    } catch (Throwable $e) {
        json_out(['error' => 'Failed to load album: ' . $e->getMessage()], 500);
    }
}

if ($method === 'POST') {
    $action = (string)($_GET['action'] ?? ($_POST['action'] ?? ''));
    if ($action === '') {
        $body = json_body();
        $action = (string)($body['action'] ?? '');
    }

    // Heart / like a photo
    if ($action === 'like') {
        $body = json_body();
        $id = (int)($body['id'] ?? ($_POST['id'] ?? ($_GET['id'] ?? 0)));
        if ($id <= 0) {
            json_out(['error' => 'Invalid photo id'], 400);
        }
        $stmt = db()->prepare('UPDATE album_photos SET likes = likes + 1 WHERE id = ?');
        $stmt->execute([$id]);
        $row = db()->prepare('SELECT id, likes FROM album_photos WHERE id = ?');
        $row->execute([$id]);
        $r = $row->fetch();
        json_out(['ok' => true, 'id' => $id, 'likes' => (int)($r['likes'] ?? 0)]);
    }

    // Admin actions via POST (approve/hide/delete)
    if ($action === 'delete' || $action === 'toggle_approve' || $action === 'clear_all') {
        require_auth();
        check_csrf();
        $body = json_body();
        if ($action === 'clear_all') {
            $rows = db()->query('SELECT filename FROM album_photos')->fetchAll();
            $dir = rtrim(cfg()['upload_dir'], '/') . '/album';
            foreach ($rows as $r) {
                $f = $dir . '/' . basename((string)$r['filename']);
                if (is_file($f)) @unlink($f);
            }
            db()->exec('DELETE FROM album_photos');
            json_out(['ok' => true]);
        }
        $id = (int)($body['id'] ?? ($_GET['id'] ?? 0));
        if ($id <= 0) {
            json_out(['error' => 'Invalid photo id'], 400);
        }
        if ($action === 'toggle_approve') {
            $approved = isset($body['approved']) ? ((int)$body['approved'] ? 1 : 0) : 1;
            $stmt = db()->prepare('UPDATE album_photos SET approved = ? WHERE id = ?');
            $stmt->execute([$approved, $id]);
            json_out(['ok' => true, 'id' => $id, 'approved' => $approved]);
        }
        if ($action === 'delete') {
            $stmt = db()->prepare('SELECT filename FROM album_photos WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                $path = rtrim(cfg()['upload_dir'], '/') . '/album/' . basename((string)$row['filename']);
                if (is_file($path)) {
                    @unlink($path);
                }
            }
            db()->prepare('DELETE FROM album_photos WHERE id = ?')->execute([$id]);
            json_out(['ok' => true]);
        }
    }

    // Guest photo upload (multipart/form-data OR JSON with base64 dataUrl)
    $honeypot = trim((string)($_POST['website'] ?? ''));
    if ($honeypot !== '') {
        json_out(['error' => 'Spam detected'], 400);
    }

    $guestName = trim((string)($_POST['guest_name'] ?? ''));
    $caption = trim((string)($_POST['caption'] ?? ''));
    $category = trim((string)($_POST['category'] ?? 'Reception'));

    $c = cfg();
    $maxBytes = max((int)($c['max_image_bytes'] ?? 6291456), 12 * 1024 * 1024); // allow up to 12 MB camera shots before server resize
    $imageMimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

    $dir = rtrim($c['upload_dir'], '/') . '/album';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    if (!is_dir($dir) || !is_writable($dir)) {
        json_out(['error' => 'Album upload directory is not writable'], 500);
    }

    // Check if JSON base64 upload or standard $_FILES upload
    $uploadedItems = [];
    if (!empty($_FILES['file']) || !empty($_FILES['files'])) {
        // Normalize single or multiple files
        $files = [];
        if (!empty($_FILES['files']) && is_array($_FILES['files']['name'])) {
            $count = count($_FILES['files']['name']);
            for ($i = 0; $i < $count; $i++) {
                $files[] = [
                    'name' => $_FILES['files']['name'][$i],
                    'tmp_name' => $_FILES['files']['tmp_name'][$i],
                    'error' => $_FILES['files']['error'][$i],
                    'size' => $_FILES['files']['size'][$i],
                ];
            }
        } elseif (!empty($_FILES['file'])) {
            if (is_array($_FILES['file']['name'])) {
                $count = count($_FILES['file']['name']);
                for ($i = 0; $i < $count; $i++) {
                    $files[] = [
                        'name' => $_FILES['file']['name'][$i],
                        'tmp_name' => $_FILES['file']['tmp_name'][$i],
                        'error' => $_FILES['file']['error'][$i],
                        'size' => $_FILES['file']['size'][$i],
                    ];
                }
            } else {
                $files[] = $_FILES['file'];
            }
        }

        if (empty($files)) {
            json_out(['error' => 'No photo selected'], 400);
        }

        if ($guestName === '') $guestName = 'Wedding Guest';
        $guestName = mb_substr($guestName, 0, 80);
        $caption = mb_substr($caption, 0, 280);
        $allowedCats = ['Ceremony', 'Reception', 'Candid', 'Couple', 'Selfies', 'Family & Friends'];
        if (!in_array($category, $allowedCats, true)) {
            $category = 'Reception';
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);

        foreach ($files as $file) {
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                continue;
            }
            $tmp = (string)$file['tmp_name'];
            $size = (int)$file['size'];
            if ($size <= 0 || $size > $maxBytes) {
                json_out(['error' => 'Photo is too large (max 12 MB)'], 413);
            }
            $mime = $finfo->file($tmp) ?: 'application/octet-stream';
            if (!isset($imageMimes[$mime])) {
                json_out(['error' => 'Only JPEG, PNG, and WebP photos are allowed'], 415);
            }
            $ext = $imageMimes[$mime];
            $filename = 'moment-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
            $dest = $dir . '/' . $filename;

            if (!move_uploaded_file($tmp, $dest)) {
                json_out(['error' => 'Could not save uploaded photo'], 500);
            }
            @chmod($dest, 0644);

            $maxDim = (int)($c['image_max_dim'] ?? 1800) ?: 1800;
            album_resize_image($dest, $mime, $maxDim);

            $finalSize = (int)@filesize($dest);
            $url = rtrim($c['upload_url'], '/') . '/album/' . $filename;
            $now = gmdate('Y-m-d H:i:s');

            $stmt = db()->prepare('INSERT INTO album_photos (guest_name, caption, category, filename, url, mime, size, likes, approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?)');
            $stmt->execute([$guestName, $caption, $category, $filename, $url, $mime, $finalSize, $now]);
            $id = (int)db()->lastInsertId();

            $uploadedItems[] = [
                'id' => $id,
                'guest_name' => $guestName,
                'caption' => $caption,
                'category' => $category,
                'filename' => $filename,
                'url' => $url,
                'mime' => $mime,
                'size' => $finalSize,
                'likes' => 0,
                'approved' => 1,
                'created_at' => $now,
            ];
        }

        if (empty($uploadedItems)) {
            json_out(['error' => 'No valid photos were uploaded'], 400);
        }

        json_out(['ok' => true, 'photo' => $uploadedItems[0], 'photos' => $uploadedItems]);
    }

    // Fallback: JSON body with base64 dataUrl
    $body = json_body();
    if (!empty($body['website'])) {
        json_out(['error' => 'Spam detected'], 400);
    }
    $dataUrl = (string)($body['dataUrl'] ?? '');
    if ($dataUrl !== '' && preg_match('#^data:(image/(?:jpeg|png|webp));base64,(.+)$#i', $dataUrl, $m)) {
        $mime = strtolower($m[1]);
        $raw = base64_decode($m[2], true);
        if ($raw === false || strlen($raw) > $maxBytes) {
            json_out(['error' => 'Invalid or oversized image data'], 400);
        }
        $ext = $imageMimes[$mime] ?? 'jpg';
        $filename = 'moment-' . gmdate('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        $dest = $dir . '/' . $filename;
        if (file_put_contents($dest, $raw) === false) {
            json_out(['error' => 'Could not write photo to disk'], 500);
        }
        @chmod($dest, 0644);

        $guestName = trim((string)($body['guest_name'] ?? 'Wedding Guest')) ?: 'Wedding Guest';
        $guestName = mb_substr($guestName, 0, 80);
        $caption = mb_substr(trim((string)($body['caption'] ?? '')), 0, 280);
        $category = trim((string)($body['category'] ?? 'Reception'));
        $allowedCats = ['Ceremony', 'Reception', 'Candid', 'Couple', 'Selfies', 'Family & Friends'];
        if (!in_array($category, $allowedCats, true)) {
            $category = 'Reception';
        }

        $maxDim = (int)($c['image_max_dim'] ?? 1800) ?: 1800;
        album_resize_image($dest, $mime, $maxDim);

        $finalSize = (int)@filesize($dest);
        $url = rtrim($c['upload_url'], '/') . '/album/' . $filename;
        $now = gmdate('Y-m-d H:i:s');

        $stmt = db()->prepare('INSERT INTO album_photos (guest_name, caption, category, filename, url, mime, size, likes, approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?)');
        $stmt->execute([$guestName, $caption, $category, $filename, $url, $mime, $finalSize, $now]);
        $id = (int)db()->lastInsertId();

        $photo = [
            'id' => $id,
            'guest_name' => $guestName,
            'caption' => $caption,
            'category' => $category,
            'filename' => $filename,
            'url' => $url,
            'mime' => $mime,
            'size' => $finalSize,
            'likes' => 0,
            'approved' => 1,
            'created_at' => $now,
        ];
        json_out(['ok' => true, 'photo' => $photo, 'photos' => [$photo]]);
    }

    json_out(['error' => 'No photo provided'], 400);
}

if ($method === 'DELETE') {
    require_auth();
    check_csrf();
    if (!empty($_GET['all'])) {
        $rows = db()->query('SELECT filename FROM album_photos')->fetchAll();
        $dir = rtrim(cfg()['upload_dir'], '/') . '/album';
        foreach ($rows as $r) {
            $f = $dir . '/' . basename((string)$r['filename']);
            if (is_file($f)) @unlink($f);
        }
        db()->exec('DELETE FROM album_photos');
        json_out(['ok' => true]);
    }
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        json_out(['error' => 'Missing id'], 400);
    }
    $stmt = db()->prepare('SELECT filename FROM album_photos WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row) {
        $path = rtrim(cfg()['upload_dir'], '/') . '/album/' . basename((string)$row['filename']);
        if (is_file($path)) {
            @unlink($path);
        }
    }
    db()->prepare('DELETE FROM album_photos WHERE id = ?')->execute([$id]);
    json_out(['ok' => true]);
}

json_out(['error' => 'Method not allowed'], 405);

function album_resize_image(string $path, string $mime, int $maxDim): void
{
    if (!function_exists('imagecreatetruecolor')) {
        return;
    }
    $info = @getimagesize($path);
    if (!$info) {
        return;
    }
    [$w, $h] = $info;
    if ($w <= $maxDim && $h <= $maxDim) {
        return;
    }
    $scale = $maxDim / max($w, $h);
    $nw = max(1, (int)round($w * $scale));
    $nh = max(1, (int)round($h * $scale));

    switch ($mime) {
        case 'image/jpeg': $src = @imagecreatefromjpeg($path); break;
        case 'image/png': $src = @imagecreatefrompng($path); break;
        case 'image/webp': $src = @imagecreatefromwebp($path); break;
        default: return;
    }
    if (!$src) {
        return;
    }
    $dst = imagecreatetruecolor($nw, $nh);
    if ($mime === 'image/png' || $mime === 'image/webp') {
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
    }
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

    switch ($mime) {
        case 'image/jpeg': imagejpeg($dst, $path, 84); break;
        case 'image/png': imagepng($dst, $path, 7); break;
        case 'image/webp': imagewebp($dst, $path, 84); break;
    }
    imagedestroy($src);
    imagedestroy($dst);
}
