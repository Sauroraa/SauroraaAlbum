<?php

namespace App\Controllers;

use PDO;

class AdminAuthController
{
    public function __construct(private PDO $db)
    {
    }

    public function login(array $payload): void
    {
        $email = trim((string) ($payload['email'] ?? ''));
        $password = (string) ($payload['password'] ?? '');
        $bootstrapEmail = getenv('ADMIN_BOOTSTRAP_EMAIL') ?: 'admin@sauroraa.be';
        $bootstrapPassword = getenv('ADMIN_BOOTSTRAP_PASSWORD') ?: 'password';

        if (!$email || !$password) {
            jsonResponse(['message' => 'Email et mot de passe requis.'], 422);
        }

        $stmt = $this->db->prepare('SELECT * FROM admins WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int) $admin['id'];
            $_SESSION['admin_email'] = $admin['email'];

            jsonResponse([
                'data' => [
                    'id' => (int) $admin['id'],
                    'email' => $admin['email'],
                    'role' => $admin['role'],
                ],
            ]);
        }

        if ($email === $bootstrapEmail && hash_equals($bootstrapPassword, $password)) {
            session_regenerate_id(true);
            $_SESSION['admin_id'] = 0;
            $_SESSION['admin_email'] = $bootstrapEmail;

            jsonResponse([
                'data' => [
                    'id' => 0,
                    'email' => $bootstrapEmail,
                    'role' => 'bootstrap_admin',
                ],
            ]);
        }

        jsonResponse(['message' => 'Identifiants invalides.'], 401);
    }

    public function logout(): void
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }

        session_destroy();
        jsonResponse(['message' => 'Déconnecté.']);
    }

    public function me(): void
    {
        if (!isset($_SESSION['admin_id'])) {
            jsonResponse(['data' => null]);
        }

        jsonResponse([
            'data' => [
                'id' => (int) $_SESSION['admin_id'],
                'email' => $_SESSION['admin_email'] ?? null,
            ],
        ]);
    }
}
