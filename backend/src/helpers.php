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

function ensureDirectory(string $path): void
{
    if (!is_dir($path)) {
        mkdir($path, 0775, true);
    }
}

function slugify(string $value): string
{
    $value = trim(mb_strtolower($value));
    $value = preg_replace('/[^\pL\pN]+/u', '-', $value);
    $value = trim($value, '-');

    return $value ?: 'event';
}

