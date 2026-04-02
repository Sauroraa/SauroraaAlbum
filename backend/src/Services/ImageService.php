<?php

namespace App\Services;

class ImageService
{
    private const ALLOWED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    private const ALLOWED_EXTENSIONS = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
    ];

    public static function storeEventImage(array $file, int $year, string $slug): array
    {
        $uploadError = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);

        if ($uploadError !== UPLOAD_ERR_OK) {
            throw new \RuntimeException(self::uploadErrorMessage($uploadError));
        }

        $mime = self::detectMime($file);

        if (!isset(self::ALLOWED_MIMES[$mime])) {
            throw new \RuntimeException('Format image non supporte. Utilisez JPG, PNG ou WebP.');
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

        if (!self::persistUploadedFile($file['tmp_name'], dirname(__DIR__, 2) . '/uploads/' . $originalRelative)) {
            throw new \RuntimeException('Impossible d’enregistrer le fichier uploadé sur le serveur.');
        }

        $originalPath = dirname(__DIR__, 2) . '/uploads/' . $originalRelative;
        $source = self::createImageResource($originalPath, $mime);

        if ($source) {
            self::resizeAndWrite($source, dirname(__DIR__, 2) . '/uploads/' . $webRelative, 1800, 82);
            self::resizeAndWrite($source, dirname(__DIR__, 2) . '/uploads/' . $thumbRelative, 640, 76);
            imagedestroy($source);
        } else {
            if (!@copy($originalPath, dirname(__DIR__, 2) . '/uploads/' . $webRelative)) {
                throw new \RuntimeException('Impossible de générer la version web de l’image.');
            }
            if (!@copy($originalPath, dirname(__DIR__, 2) . '/uploads/' . $thumbRelative)) {
                throw new \RuntimeException('Impossible de générer la miniature de l’image.');
            }
        }

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
        if (!imagewebp($canvas, $targetPath, $quality)) {
            imagedestroy($canvas);
            throw new \RuntimeException('Impossible d’écrire l’image optimisée.');
        }
        imagedestroy($canvas);
    }

    private static function createImageResource(string $path, string $mime): ?\GdImage
    {
        return match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path) ?: null,
            'image/png' => @imagecreatefrompng($path) ?: null,
            'image/webp' => function_exists('imagecreatefromwebp') ? (@imagecreatefromwebp($path) ?: null) : null,
            default => null,
        };
    }

    private static function detectMime(array $file): string
    {
        $tmpName = (string) ($file['tmp_name'] ?? '');
        $originalName = (string) ($file['name'] ?? '');

        $mime = '';
        if ($tmpName !== '' && is_file($tmpName)) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $detected = finfo_file($finfo, $tmpName);
                finfo_close($finfo);
                if (is_string($detected)) {
                    $mime = $detected;
                }
            }

            if (!$mime && function_exists('mime_content_type')) {
                $detected = @mime_content_type($tmpName);
                if (is_string($detected)) {
                    $mime = $detected;
                }
            }
        }

        if (isset(self::ALLOWED_MIMES[$mime])) {
            return $mime;
        }

        $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
        if (isset(self::ALLOWED_EXTENSIONS[$extension])) {
            return self::ALLOWED_EXTENSIONS[$extension];
        }

        throw new \RuntimeException('Format image non supporté. Utilisez JPG, PNG ou WebP.');
    }

    private static function persistUploadedFile(string $tmpName, string $destination): bool
    {
        if ($tmpName === '' || !is_file($tmpName)) {
            return false;
        }

        $directory = dirname($destination);
        ensureDirectory($directory);

        if (@move_uploaded_file($tmpName, $destination)) {
            return true;
        }

        if (@rename($tmpName, $destination)) {
            return true;
        }

        if (@copy($tmpName, $destination)) {
            @unlink($tmpName);
            return true;
        }

        error_log(sprintf(
            '[upload] Failed to persist file. tmp=%s destination=%s writable=%s',
            $tmpName,
            $destination,
            is_writable($directory) ? 'yes' : 'no'
        ));

        return false;
    }
}
