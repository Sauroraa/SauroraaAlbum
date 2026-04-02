<?php

return [
    'name' => getenv('APP_NAME') ?: 'Sauroraa Albums',
    'url' => rtrim(getenv('APP_URL') ?: 'http://localhost:8080', '/'),
    'debug' => filter_var(getenv('APP_DEBUG') ?: false, FILTER_VALIDATE_BOOL),
    'session_cookie_name' => getenv('SESSION_COOKIE_NAME') ?: 'sauroraa_album_session',
    'max_upload_size' => (int) (getenv('MAX_UPLOAD_SIZE') ?: 15728640),
    'db' => [
        'host' => getenv('DB_HOST') ?: 'db',
        'port' => getenv('DB_PORT') ?: '3306',
        'name' => getenv('DB_NAME') ?: 'sauroraa_album',
        'user' => getenv('DB_USER') ?: 'sauroraa',
        'password' => getenv('DB_PASSWORD') ?: 'change-me',
    ],
];

