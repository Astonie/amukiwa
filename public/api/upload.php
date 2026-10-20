<?php
declare(strict_types=1);

require_once __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(['error' => 'Method not allowed'], 405);
}

require_auth();
check_csrf();

try {
    auto_install_if_needed();
} catch (Throwable $e) {
    json_out(['error' => 'Database not ready: ' . $e->getMessage()], 500);
}

if (empty($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    json_out(['error' => 'No file uploaded'], 400);
}

$c = cfg();
$file = $_FILES['file'];
$tmp = $file['tmp_name'];
$size = (int)$file['size'];
$origName = (string)$file['name'];

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($tmp) ?: 'application/octet-stream';
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));

$imageMimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
$audioMimes = [
    'audio/mpeg' => 'mp3', 'audio/mp3' => 'mp3', 'audio/wav' => 'wav', 'audio/x-wav' => 'wav',
    'audio/ogg' => 'ogg', 'audio/mp4' => 'm4a', 'audio/x-m4a' => 'm4a', 'audio/aac' => 'aac',
];

if (isset($imageMimes[$mime])) {
    $kind = 'image';
    $ext = $imageMimes[$mime];
    if ($size > (int)$c['max_image_bytes']) {
        json_out(['error' => 'Image too large (max ' . round($c['max_image_bytes'] / 1048576, 1) . ' MB)'], 413);
    }
} elseif (isset($audioMimes[$mime]) || in_array($ext, ['mp3', 'm4a', 'wav', 'ogg', 'aac'], true)) {
    $kind = 'audio';
    $ext = $audioMimes[$mime] ?? $ext;
    if ($size > (int)$c['max_audio_bytes']) {
        json_out(['error' => 'Audio too large (max ' . round($c['max_audio_bytes'] / 1048576, 1) . ' MB)'], 413);
    }
} else {
    json_out(['error' => 'Unsupported file type: ' . $mime], 415);
}

$base = preg_replace('/[^a-z0-9]+/i', '-', pathinfo($origName, PATHINFO_FILENAME));
$base = trim(strtolower($base), '-');
if ($base === '') {
    $base = $kind;
}
$filename = $base . '-' . bin2hex(random_bytes(4)) . '.' . $ext;

$dir = rtrim($c['upload_dir'], '/');
if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
}
if (!is_dir($dir) || !is_writable($dir)) {
    json_out(['error' => 'Upload directory is not writable'], 500);
}
$dest = $dir . '/' . $filename;

if (!move_uploaded_file($tmp, $dest)) {
    json_out(['error' => 'Could not save the uploaded file'], 500);
}
@chmod($dest, 0644);

if ($kind === 'image' && (int)$c['image_max_dim'] > 0) {
    resize_image_in_place($dest, $mime, (int)$c['image_max_dim']);
}

$size = (int)@filesize($dest);
$url = rtrim($c['upload_url'], '/') . '/' . $filename;

$stmt = db()->prepare('INSERT INTO media (filename, url, mime, kind, size, created_at) VALUES (?, ?, ?, ?, ?, ?)');
$stmt->execute([$filename, $url, $mime, $kind, $size, gmdate('Y-m-d H:i:s')]);
$id = (int)db()->lastInsertId();

json_out(['ok' => true, 'id' => $id, 'url' => $url, 'filename' => $filename, 'mime' => $mime, 'kind' => $kind, 'size' => $size]);

function resize_image_in_place(string $path, string $mime, int $maxDim): void
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
        case 'image/gif': $src = @imagecreatefromgif($path); break;
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
        case 'image/jpeg': imagejpeg($dst, $path, 82); break;
        case 'image/png': imagepng($dst, $path, 7); break;
        case 'image/webp': imagewebp($dst, $path, 82); break;
        case 'image/gif': imagegif($dst, $path); break;
    }
    imagedestroy($src);
    imagedestroy($dst);
}
