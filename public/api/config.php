<?php
// Wedding site configuration.
// For Hostinger: fill in the database details from hPanel -> Databases -> MySQL Databases.
// The database name/user usually look like u123456789_wedding / u123456789_admin.

return [
    // 'mysql' for Hostinger, 'sqlite' for local testing (no setup required).
    'driver' => 'sqlite',

    // --- MySQL (Hostinger) ---
    'host' => 'localhost',
    'name' => 'u000000000_wedding',
    'user' => 'u000000000_admin',
    'pass' => 'CHANGE_ME',

    // --- SQLite (local dev only) ---
    'sqlite_path' => __DIR__ . '/../data/wedding.sqlite',

    // --- Uploads ---
    'upload_dir' => __DIR__ . '/../uploads',
    'upload_url' => 'uploads',          // relative to the site root
    'max_image_bytes' => 6291456,       // 6 MB
    'max_audio_bytes' => 26214400,      // 25 MB
    'image_max_dim' => 1800,            // longest side, px (0 = no resize)

    // Optional: SoundCloud client id if you ever want server-side resolving.
    'soundcloud_client_id' => '',
];
