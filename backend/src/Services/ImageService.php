<?php

namespace App\Services;

class ImageService
{
    private const ALLOWED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public static function storeEventImage(array $file, int $year, string $slug): array
    {
        $uploadError = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($uploadError !== UPLOAD_ERR_OK) {
            throw new \RuntimeException(self::uploadErrorMessage($uploadError));
        }

        $mime = mime_content_type($file['tmp_name']);

        if (!isset(self::ALLOWED_MIMES[$mime])) {
            throw new \RuntimeException('Format image non supporte. Utilisez JPG, PNG ou WebP.');
        }

        $source = imagecreatefromstring((string) file_get_contents($file['tmp_name']));

        if (!$source) {
            throw new \RuntimeException('Impossible de lire l’image.');
        }

        $baseDir = dirname(__DIR__, 2) . '/uploads/events/' . $year . '/' . $slug;
        $originalDir = $baseDir . '/original';
        $webDir = $baseDir . '/web';
        $thumbDir = $baseDir . '/thumb';

        ensureDirectory($originalDir);
        ensureDirectory($webDir);
        ensureDirectory($thumbDir);

        $safeName = uniqid('photo_', true);
        $originalExt = self::ALLOWED_MIMES[$mime];
        $originalRelative = 'events/' . $year . '/' . $slug . '/original/' . $safeName . '.' . $originalExt;
        $webRelative = 'events/' . $year . '/' . $slug . '/web/' . $safeName . '.webp';
        $thumbRelative = 'events/' . $year . '/' . $slug . '/thumb/' . $safeName . '.webp';

        if (!move_uploaded_file($file['tmp_name'], dirname(__DIR__, 2) . '/uploads/' . $originalRelative)) {
            throw new \RuntimeException('Impossible de déplacer le fichier uploadé.');
        }

        self::resizeAndWrite($source, dirname(__DIR__, 2) . '/uploads/' . $webRelative, 1800, 82);
        self::resizeAndWrite($source, dirname(__DIR__, 2) . '/uploads/' . $thumbRelative, 640, 76);
        imagedestroy($source);

        return [
            'filename' => $safeName . '.' . $originalExt,
            'filepath' => $webRelative,
            'thumbnail_path' => $thumbRelative,
        ];
    }

    private static function uploadErrorMessage(int $errorCode): string
    {
        return match ($errorCode) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Fichier trop volumineux. Reduisez la taille de l’image.',
            UPLOAD_ERR_PARTIAL => 'Upload incomplet. Reessayez.',
            UPLOAD_ERR_NO_FILE => 'Aucun fichier recu.',
            UPLOAD_ERR_NO_TMP_DIR => 'Dossier temporaire introuvable sur le serveur.',
            UPLOAD_ERR_CANT_WRITE => 'Impossible d’ecrire le fichier sur le disque.',
            UPLOAD_ERR_EXTENSION => 'Upload bloque par une extension serveur.',
            default => 'Upload invalide.',
        };
    }

    private static function resizeAndWrite(\GdImage $source, string $targetPath, int $maxWidth, int $quality): void
    {
        $width = imagesx($source);
        $height = imagesy($source);
        $ratio = min(1, $maxWidth / max(1, $width));
        $newWidth = (int) round($width * $ratio);
        $newHeight = (int) round($height * $ratio);

        $canvas = imagecreatetruecolor($newWidth, $newHeight);
        imagealphablending($canvas, true);
        imagesavealpha($canvas, true);
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagewebp($canvas, $targetPath, $quality);
        imagedestroy($canvas);
    }
}
