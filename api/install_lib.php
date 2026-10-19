<?php
declare(strict_types=1);

// Schema creation shared by install.php and the auto-installer.
// SQL is written per driver because MySQL and SQLite differ.

function wedding_schema_statements(): array
{
    $driver = cfg()['driver'] ?? 'mysql';

    if ($driver === 'sqlite') {
        return [
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            "CREATE TABLE IF NOT EXISTS content (
                id INTEGER PRIMARY KEY,
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            "CREATE TABLE IF NOT EXISTS media (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                url TEXT NOT NULL,
                mime TEXT NOT NULL,
                kind TEXT NOT NULL,
                size INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )",
            "CREATE TABLE IF NOT EXISTS rsvps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                guests INTEGER DEFAULT 1,
                attending TEXT DEFAULT 'yes',
                message TEXT,
                created_at TEXT NOT NULL
            )",
            "CREATE TABLE IF NOT EXISTS guestbook (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                note TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
        ];
    }

    return [
        "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(64) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS content (
            id TINYINT PRIMARY KEY,
            data LONGTEXT NOT NULL,
            updated_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS media (
            id INT AUTO_INCREMENT PRIMARY KEY,
            filename VARCHAR(255) NOT NULL,
            url VARCHAR(512) NOT NULL,
            mime VARCHAR(128) NOT NULL,
            kind VARCHAR(16) NOT NULL,
            size INT NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX (kind)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS rsvps (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(160) DEFAULT '',
            phone VARCHAR(40) DEFAULT '',
            guests INT DEFAULT 1,
            attending VARCHAR(10) DEFAULT 'yes',
            message TEXT,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS guestbook (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            note TEXT NOT NULL,
            created_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];
}

function wedding_install_schema(): void
{
    foreach (wedding_schema_statements() as $sql) {
        db()->exec($sql);
    }
}
