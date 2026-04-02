<?php

declare(strict_types=1);

use App\Auth;
use App\Controllers\AdminAuthController;
use App\Controllers\AdminEventController;
use App\Controllers\AdminPhotoController;
use App\Controllers\AnalyticsController;
use App\Controllers\PublicController;
use App\Database;

require dirname(__DIR__) . '/src/helpers.php';

spl_autoload_register(function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
    $file = dirname(__DIR__) . '/src/' . $relative . '.php';
    if (file_exists($file)) {
        require $file;
    }
});

$config = require dirname(__DIR__) . '/config/app.php';

session_name($config['session_cookie_name']);
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

header('Access-Control-Allow-Origin: ' . ($config['url'] ?: '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$db = Database::connect($config['db']);
$public = new PublicController($db);
$adminAuth = new AdminAuthController($db);
$adminEvents = new AdminEventController($db, $public);
$adminPhotos = new AdminPhotoController($db);
$analytics = new AnalyticsController($db);

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';

if ($uri === '/api/years' && $method === 'GET') {
    $public->years();
}

if ($uri === '/api/events' && $method === 'GET') {
    $public->events();
}

if (preg_match('#^/api/events/year/(\d{4})$#', $uri, $matches) && $method === 'GET') {
    $public->events((int) $matches[1]);
}

if (preg_match('#^/api/events/([a-z0-9-]+)$#', $uri, $matches) && $method === 'GET') {
    $public->eventBySlug($matches[1]);
}

if ($uri === '/api/analytics/site' && $method === 'GET') {
    $analytics->publicSummary();
}

if ($uri === '/api/analytics/visit' && $method === 'POST') {
    $analytics->trackVisit(requestJson());
}

if ($uri === '/api/analytics/photo-view' && $method === 'POST') {
    $analytics->trackPhotoView(requestJson());
}

if ($uri === '/api/analytics/photo-download' && $method === 'POST') {
    $analytics->trackPhotoDownload(requestJson());
}

if ($uri === '/api/admin/me' && $method === 'GET') {
    $adminAuth->me();
}

if ($uri === '/api/admin/login' && $method === 'POST') {
    $adminAuth->login(requestJson());
}

if ($uri === '/api/admin/logout' && $method === 'POST') {
    Auth::requireAdmin();
    $adminAuth->logout();
}

if ($uri === '/api/admin/events' && $method === 'GET') {
    Auth::requireAdmin();
    $adminEvents->index();
}

if ($uri === '/api/admin/analytics' && $method === 'GET') {
    Auth::requireAdmin();
    $analytics->summary();
}

if ($uri === '/api/admin/events' && $method === 'POST') {
    Auth::requireAdmin();
    $adminEvents->store(requestJson());
}

if (preg_match('#^/api/admin/events/(\d+)$#', $uri, $matches) && $method === 'PUT') {
    Auth::requireAdmin();
    $adminEvents->update((int) $matches[1], requestJson());
}

if (preg_match('#^/api/admin/events/(\d+)$#', $uri, $matches) && $method === 'DELETE') {
    Auth::requireAdmin();
    $adminEvents->delete((int) $matches[1]);
}

if ($uri === '/api/admin/photos/upload' && $method === 'POST') {
    Auth::requireAdmin();
    $adminPhotos->upload();
}

if ($uri === '/api/admin/photos/reorder' && $method === 'PUT') {
    Auth::requireAdmin();
    $adminPhotos->reorder(requestJson());
}

if (preg_match('#^/api/admin/photos/(\d+)$#', $uri, $matches) && $method === 'DELETE') {
    Auth::requireAdmin();
    $adminPhotos->delete((int) $matches[1]);
}

jsonResponse(['message' => 'Route introuvable.'], 404);
