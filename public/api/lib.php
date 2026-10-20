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

function require_role(string $role): void
{
    require_auth();
    start_session();
    $userRole = $_SESSION['role'] ?? 'viewer';
    $levels = ['viewer' => 1, 'editor' => 2, 'admin' => 3];
    if (($levels[$userRole] ?? 0) < ($levels[$role] ?? 99)) {
        json_out(['error' => 'Insufficient permissions'], 403);
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
    if (table_exists('content') && table_exists('users') && table_exists('site_settings')) {
        run_migrations();
        return;
    }
    require_once __DIR__ . '/install_lib.php';
    wedding_install_schema();
    run_migrations();
    if (!table_exists('users') || (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn() === 0) {
        create_default_admin();
    }
    // Seed normalized content tables if empty
    try {
        if (table_exists('site_settings') && (int)db()->query('SELECT COUNT(*) FROM site_settings')->fetchColumn() === 0) {
            seed_content_tables_from_json();
        }
    } catch (Throwable $e) {}
    if (table_exists('content') && (int)db()->query('SELECT COUNT(*) FROM content')->fetchColumn() === 0) {
        seed_content_from_json();
    }
}


function column_exists(string $table, string $col): bool
{
    $c = cfg();
    try {
        if (($c['driver'] ?? 'sqlite') === 'sqlite') {
            $rows = db()->query("PRAGMA table_info($table)")->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $r) if (($r['name'] ?? '') === $col) return true;
            return false;
        }
        $stmt = db()->prepare("SHOW COLUMNS FROM $table LIKE ?");
        $stmt->execute([$col]);
        return (bool)$stmt->fetch();
    } catch (Throwable $e) { return false; }
}

function add_column_if_missing(string $table, string $col, string $def): void
{
    if (column_exists($table, $col)) return;
    try { db()->exec("ALTER TABLE $table ADD COLUMN $col $def"); } catch (Throwable $e) {}
}

function run_migrations(): void
{
    // Ensure meta table exists
    try {
        db()->exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)");
    } catch (Throwable $e) {}
    // Ensure audit_log exists
    try {
        $driver = cfg()['driver'] ?? 'sqlite';
        if ($driver === 'sqlite') {
            db()->exec("CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, action TEXT, entity TEXT, details TEXT, created_at TEXT NOT NULL)");
        } else {
            db()->exec("CREATE TABLE IF NOT EXISTS audit_log (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(64), action VARCHAR(64), entity VARCHAR(64), details TEXT, created_at DATETIME NOT NULL)");
        }
    } catch (Throwable $e) {}
    // Column migrations
    add_column_if_missing('users', 'role', "TEXT NOT NULL DEFAULT 'admin'");
    add_column_if_missing('site_settings', 'updated_at', 'TEXT');
    add_column_if_missing('rsvps', 'first', "TEXT DEFAULT ''");
    add_column_if_missing('rsvps', 'last', "TEXT DEFAULT ''");
    add_column_if_missing('rsvps', 'diet', 'TEXT');
    // content version tracking in meta
    $v = 0;
    try {
        $r = db()->query("SELECT value FROM meta WHERE key = 'schema_version'")->fetchColumn();
        $v = (int)$r;
    } catch (Throwable $e) {}
    if ($v < 1) {
        try { db()->exec("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '1')"); } catch (Throwable $e) {
            try { db()->exec("REPLACE INTO meta (key, value) VALUES ('schema_version', '1')"); } catch (Throwable $e2) {}
        }
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

function _norm($v) { return is_string($v) ? $v : ($v === null ? null : (string)$v); }

function seed_content_tables_from_json(): void
{
    $file = __DIR__ . '/../content.json';
    $data = json_decode(@file_get_contents($file) ?: '{}', true);
    if (!is_array($data)) $data = [];
    save_content_to_tables($data);
}

function content_from_tables(): ?array
{
    try {
        $pdo = db();
        $site = $pdo->query('SELECT * FROM site_settings WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
        if (!$site) return null;
    } catch (Throwable $e) { return null; }

    $out = [];
    // site
    $out['site'] = [
        'eyebrow' => $site['eyebrow'] ?? '',
        'storyTitle' => $site['story_title'] ?? '',
        'storySub' => $site['story_sub'] ?? '',
        'detailsTitle' => $site['details_title'] ?? '',
        'detailsSub' => $site['details_sub'] ?? '',
        'galleryTitle' => $site['gallery_title'] ?? '',
        'gallerySub' => $site['gallery_sub'] ?? '',
        'partyTitle' => $site['party_title'] ?? '',
        'partySub' => $site['party_sub'] ?? '',
        'rsvpTitle' => $site['rsvp_title'] ?? '',
        'rsvpSub' => $site['rsvp_sub'] ?? '',
        'faqTitle' => $site['faq_title'] ?? '',
        'faqSub' => $site['faq_sub'] ?? '',
        'guestbookTitle' => $site['guestbook_title'] ?? '',
        'guestbookSub' => $site['guestbook_sub'] ?? '',
        'footerMessage' => $site['footer_message'] ?? '',
    ];
    $out['updated_at'] = $site['updated_at'] ?? null;
    // couple
    $c = $pdo->query('SELECT * FROM couple WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
    $out['couple'] = $c ? [
        'groom' => $c['groom'] ?? '', 'bride' => $c['bride'] ?? '',
        'dateISO' => $c['date_iso'] ?? '', 'dateDisplay' => $c['date_display'] ?? '',
        'location' => $c['location'] ?? '', 'venue' => $c['venue'] ?? '',
        'rsvpDeadline' => $c['rsvp_deadline'] ?? '', 'hashtag' => $c['hashtag'] ?? '',
    ] : [];
    // invitation
    $inv = $pdo->query('SELECT * FROM invitation WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
    $out['invitation'] = $inv ? [
        'eyebrow' => $inv['eyebrow'] ?? '', 'title' => $inv['title'] ?? '',
        'message' => $inv['message'] ?? '', 'rsvpText' => $inv['rsvp_text'] ?? '',
    ] : [];
    // media
    $m = $pdo->query('SELECT * FROM media_settings WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
    $out['media'] = $m ? [
        'heroImage' => $m['hero_image'] ?? '', 'coverImage' => $m['cover_image'] ?? '',
        'musicUrl' => $m['music_url'] ?? '',
    ] : [];
    // playlist
    $pls = $pdo->query('SELECT title, url FROM playlist ORDER BY sort_order, id')->fetchAll(PDO::FETCH_ASSOC);
    $out['media']['playlist'] = $pls ?: [];
    // story
    $st = $pdo->query('SELECT year, title, text FROM story_items ORDER BY sort_order, id')->fetchAll(PDO::FETCH_ASSOC);
    $out['story'] = $st ?: [];
    // details
    $dt = $pdo->query('SELECT title, time, place, address, map_url AS mapUrl FROM details ORDER BY sort_order, id')->fetchAll(PDO::FETCH_ASSOC);
    $out['details'] = $dt ?: [];
    // party
    $pa = $pdo->query('SELECT initial, name, role, note FROM party_members ORDER BY sort_order, id')->fetchAll(PDO::FETCH_ASSOC);
    $out['party'] = $pa ?: [];
    // faq
    $fq = $pdo->query('SELECT q, a FROM faqs ORDER BY sort_order, id')->fetchAll(PDO::FETCH_ASSOC);
    $out['faq'] = $fq ?: [];
    // gallery
    $gl = $pdo->query('SELECT url FROM gallery_images ORDER BY sort_order, id')->fetchAll(PDO::FETCH_ASSOC);
    $out['gallery'] = array_column($gl ?: [], 'url');
    return $out;
}

function save_content_to_tables(array $data): void
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        // site_settings
        $s = $data['site'] ?? [];
        $stmt = $pdo->prepare('INSERT OR REPLACE INTO site_settings (id, eyebrow, story_title, story_sub, details_title, details_sub, gallery_title, gallery_sub, party_title, party_sub, rsvp_title, rsvp_sub, faq_title, faq_sub, guestbook_title, guestbook_sub, footer_message, updated_at) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        // MySQL uses REPLACE INTO; INSERT OR REPLACE is SQLite. Handle driver.
        if (($GLOBALS['cfg']['driver'] ?? cfg()['driver'] ?? 'sqlite') !== 'sqlite') {
            $stmt = $pdo->prepare('REPLACE INTO site_settings (id, eyebrow, story_title, story_sub, details_title, details_sub, gallery_title, gallery_sub, party_title, party_sub, rsvp_title, rsvp_sub, faq_title, faq_sub, guestbook_title, guestbook_sub, footer_message, updated_at) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        }
        $stmt->execute([
            $s['eyebrow'] ?? '', $s['storyTitle'] ?? '', $s['storySub'] ?? '',
            $s['detailsTitle'] ?? '', $s['detailsSub'] ?? '',
            $s['galleryTitle'] ?? '', $s['gallerySub'] ?? '',
            $s['partyTitle'] ?? '', $s['partySub'] ?? '',
            $s['rsvpTitle'] ?? '', $s['rsvpSub'] ?? '',
            $s['faqTitle'] ?? '', $s['faqSub'] ?? '',
            $s['guestbookTitle'] ?? '', $s['guestbookSub'] ?? '',
            $s['footerMessage'] ?? '',
            gmdate('Y-m-d H:i:s'),
        ]);

        // couple
        $c = $data['couple'] ?? [];
        $stmt = $pdo->prepare((cfg()['driver']==='sqlite'?'INSERT OR REPLACE':'REPLACE') . ' INTO couple (id, groom, bride, date_iso, date_display, location, venue, rsvp_deadline, hashtag) VALUES (1,?,?,?,?,?,?,?,?)');
        $stmt->execute([$c['groom']??'', $c['bride']??'', $c['dateISO']??'', $c['dateDisplay']??'', $c['location']??'', $c['venue']??'', $c['rsvpDeadline']??'', $c['hashtag']??'']);

        // invitation
        $inv = $data['invitation'] ?? [];
        $stmt = $pdo->prepare((cfg()['driver']==='sqlite'?'INSERT OR REPLACE':'REPLACE') . ' INTO invitation (id, eyebrow, title, message, rsvp_text) VALUES (1,?,?,?,?)');
        $stmt->execute([$inv['eyebrow']??'', $inv['title']??'', $inv['message']??'', $inv['rsvpText']??'']);

        // media_settings
        $m = $data['media'] ?? [];
        $stmt = $pdo->prepare((cfg()['driver']==='sqlite'?'INSERT OR REPLACE':'REPLACE') . ' INTO media_settings (id, hero_image, cover_image, music_url) VALUES (1,?,?,?)');
        $stmt->execute([$m['heroImage']??'', $m['coverImage']??'', $m['musicUrl']??'']);

        // playlist (replace all)
        $pdo->exec('DELETE FROM playlist');
        $i=0;
        foreach (($m['playlist'] ?? []) as $t) {
            $st=$pdo->prepare('INSERT INTO playlist (title,url,sort_order) VALUES (?,?,?)');
            $st->execute([$t['title']??'', $t['url']??'', $i++]);
        }
        // story
        $pdo->exec('DELETE FROM story_items');
        $i=0;
        foreach (($data['story'] ?? []) as $t) {
            $st=$pdo->prepare('INSERT INTO story_items (year,title,text,sort_order) VALUES (?,?,?,?)');
            $st->execute([$t['year']??'', $t['title']??'', $t['text']??'', $i++]);
        }
        // details
        $pdo->exec('DELETE FROM details');
        $i=0;
        foreach (($data['details'] ?? []) as $t) {
            $st=$pdo->prepare('INSERT INTO details (title,time,place,address,map_url,sort_order) VALUES (?,?,?,?,?,?)');
            $st->execute([$t['title']??'', $t['time']??'', $t['place']??'', $t['address']??'', $t['mapUrl']??'', $i++]);
        }
        // party
        $pdo->exec('DELETE FROM party_members');
        $i=0;
        foreach (($data['party'] ?? []) as $t) {
            $st=$pdo->prepare('INSERT INTO party_members (initial,name,role,note,sort_order) VALUES (?,?,?,?,?)');
            $st->execute([$t['initial']??'', $t['name']??'', $t['role']??'', $t['note']??'', $i++]);
        }
        // faqs
        $pdo->exec('DELETE FROM faqs');
        $i=0;
        foreach (($data['faq'] ?? []) as $t) {
            $st=$pdo->prepare('INSERT INTO faqs (q,a,sort_order) VALUES (?,?,?)');
            $st->execute([$t['q']??'', $t['a']??'', $i++]);
        }
        // gallery
        $pdo->exec('DELETE FROM gallery_images');
        $i=0;
        foreach (($data['gallery'] ?? []) as $url) {
            $st=$pdo->prepare('INSERT INTO gallery_images (url,sort_order) VALUES (?,?)');
            $st->execute([$url, $i++]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Recursively merge $base with $override. $override wins on conflicts,
 * but $base keeps any keys/sections that $override is missing, so a
 * partial save can never leave the site without required content.
 */
function deep_merge(array $base, array $override): array
{
    foreach ($override as $k => $v) {
        if (is_array($v) && is_array($base[$k] ?? null) && !array_is_list($v)) {
            $base[$k] = deep_merge($base[$k], $v);
        } else {
            $base[$k] = $v;
        }
    }
    return $base;
}

function seed_content(): array
{
    $file = __DIR__ . '/../content.json';
    $data = json_decode(@file_get_contents($file) ?: '{}', true);
    return is_array($data) ? $data : [];
}
