<?php
declare(strict_types=1);

function wedding_schema_statements(): array
{
    $driver = cfg()['driver'] ?? 'mysql';
    $auto = ($driver === 'sqlite') ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT AUTO_INCREMENT PRIMARY KEY';
    $int = ($driver === 'sqlite') ? 'INTEGER' : 'INT';
    $text = ($driver === 'sqlite') ? 'TEXT' : 'TEXT';
    $varchar = ($driver === 'sqlite') ? 'TEXT' : 'VARCHAR(255)';

    $sqlite = ($driver === 'sqlite');

    if ($sqlite) {
        $users = "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'admin',
            created_at TEXT NOT NULL
        )";
        $content = "CREATE TABLE IF NOT EXISTS content (
            id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )";
        $media = "CREATE TABLE IF NOT EXISTS media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            url TEXT NOT NULL,
            mime TEXT NOT NULL,
            kind TEXT NOT NULL,
            size INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )";
        $rsvps = "CREATE TABLE IF NOT EXISTS rsvps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first TEXT DEFAULT '',
            last TEXT DEFAULT '',
            name TEXT NOT NULL,
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            guests INTEGER DEFAULT 1,
            attending TEXT DEFAULT 'yes',
            diet TEXT DEFAULT '',
            message TEXT,
            created_at TEXT NOT NULL
        )";
        $guestbook = "CREATE TABLE IF NOT EXISTS guestbook (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            note TEXT NOT NULL,
            created_at TEXT NOT NULL
        )";
    } else {
        $users = "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(64) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(16) NOT NULL DEFAULT 'admin',
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $content = "CREATE TABLE IF NOT EXISTS content (
            id TINYINT PRIMARY KEY,
            data LONGTEXT NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $media = "CREATE TABLE IF NOT EXISTS media (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            url VARCHAR(512) NOT NULL,
            mime VARCHAR(128) NOT NULL,
            kind VARCHAR(16) NOT NULL,
            size INT NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX (kind)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $rsvps = "CREATE TABLE IF NOT EXISTS rsvps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            first VARCHAR(120) DEFAULT '',
            last VARCHAR(120) DEFAULT '',
            name VARCHAR(120) NOT NULL,
            email VARCHAR(160) DEFAULT '',
            phone VARCHAR(40) DEFAULT '',
            guests INT DEFAULT 1,
            attending VARCHAR(10) DEFAULT 'yes',
            diet TEXT,
            message TEXT,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        $guestbook = "CREATE TABLE IF NOT EXISTS guestbook (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            note TEXT NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    }

    $norm = [
        "CREATE TABLE IF NOT EXISTS site_settings (
            id TINYINT PRIMARY KEY,
            eyebrow TEXT,
            story_title TEXT,
            story_sub TEXT,
            details_title TEXT,
            details_sub TEXT,
            gallery_title TEXT,
            gallery_sub TEXT,
            party_title TEXT,
            party_sub TEXT,
            rsvp_title TEXT,
            rsvp_sub TEXT,
            faq_title TEXT,
            faq_sub TEXT,
            guestbook_title TEXT,
            guestbook_sub TEXT,
            footer_message TEXT,
            updated_at TEXT
        )",
        "CREATE TABLE IF NOT EXISTS couple (
            id TINYINT PRIMARY KEY,
            groom TEXT,
            bride TEXT,
            date_iso TEXT,
            date_display TEXT,
            location TEXT,
            venue TEXT,
            rsvp_deadline TEXT,
            hashtag TEXT
        )",
        "CREATE TABLE IF NOT EXISTS invitation (
            id TINYINT PRIMARY KEY,
            eyebrow TEXT,
            title TEXT,
            message TEXT,
            rsvp_text TEXT
        )",
        "CREATE TABLE IF NOT EXISTS media_settings (
            id TINYINT PRIMARY KEY,
            hero_image TEXT,
            cover_image TEXT,
            music_url TEXT
        )",
        "CREATE TABLE IF NOT EXISTS playlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            url TEXT,
            sort_order INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS story_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            year TEXT,
            title TEXT,
            text TEXT,
            sort_order INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            time TEXT,
            place TEXT,
            address TEXT,
            map_url TEXT,
            sort_order INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS party_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            initial TEXT,
            name TEXT,
            role TEXT,
            note TEXT,
            sort_order INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS faqs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            q TEXT,
            a TEXT,
            sort_order INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS gallery_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT,
            sort_order INTEGER DEFAULT 0
        )",
        "CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT
        )",
        "CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            action TEXT,
            entity TEXT,
            details TEXT,
            created_at TEXT NOT NULL
        )",
    ];

    if (!$sqlite) {
        // adjust autoincrement keyword for MySQL
        $norm = array_map(function ($s) {
            return str_replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'INT AUTO_INCREMENT PRIMARY KEY', $s);
        }, $norm);
        // adjust TINYINT primary for child tables already ok
    }

    return array_merge([$users, $content, $media, $rsvps, $guestbook], $norm);
}

function wedding_install_schema(): void
{
    foreach (wedding_schema_statements() as $sql) {
        db()->exec($sql);
    }
}
