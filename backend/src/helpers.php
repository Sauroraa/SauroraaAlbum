<?php

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function requestJson(): array
{
    $raw = file_get_contents('php://input');

    if (!$raw) {
        return [];
    }

    $decoded = json_decode($raw, true);

    return is_array($decoded) ? $decoded : [];
}

function baseUrl(string $path = ''): string
{
    global $config;

    return rtrim($config['url'], '/') . '/' . ltrim($path, '/');
}

function assetUrl(string $path = ''): string
{
    return '/' . ltrim($path, '/');
}

function ensureDirectory(string $path): void
{
    if (!is_dir($path)) {
        if (!@mkdir($path, 0777, true) && !is_dir($path)) {
            throw new RuntimeException('Impossible de créer le dossier : ' . $path);
        }
    }

    if (!is_writable($path)) {
        @chmod($path, 0777);
    }

    if (!is_writable($path)) {
        throw new RuntimeException('Dossier non accessible en écriture : ' . $path);
    }
}

function slugify(string $value): string
{
    $value = trim(mb_strtolower($value));
    $value = preg_replace('/[^\pL\pN]+/u', '-', $value);
    $value = trim($value, '-');

    return $value ?: 'event';
}
