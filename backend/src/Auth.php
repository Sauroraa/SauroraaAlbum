<?php

namespace App;

class Auth
{
    public static function userId(): ?int
    {
        return isset($_SESSION['admin_id']) ? (int) $_SESSION['admin_id'] : null;
    }

    public static function check(): bool
    {
        return self::userId() !== null;
    }

    public static function requireAdmin(): void
    {
        if (!self::check()) {
            jsonResponse(['message' => 'Authentification requise.'], 401);
        }
    }
}

