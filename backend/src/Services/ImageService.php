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
        $targetFormat = self::outputFormatForMime($mime);
        $webExt = self::extensionForFormat($targetFormat);
        $thumbExt = self::extensionForFormat($targetFormat);
        $originalRelative = 'events/' . $year . '/' . $slug . '/original/' . $safeName . '.' . $originalExt;
        $webRelative = 'events/' . $year . '/' . $slug . '/web/' . $safeName . '.' . $webExt;
        $thumbRelative = 'events/' . $year . '/' . $slug . '/thumb/' . $safeName . '.' . $thumbExt;

        if (!self::persistUploadedFile($file['tmp_name'], dirname(__DIR__, 2) . '/uploads/' . $originalRelative)) {
            throw new \RuntimeException('Impossible d’enregistrer le fichier uploadé sur le serveur.');
        }

        $originalPath = dirname(__DIR__, 2) . '/uploads/' . $originalRelative;
        $source = self::createImageResource($originalPath, $mime);

        if ($source) {
            self::resizeAndWrite($source, dirname(__DIR__, 2) . '/uploads/' . $webRelative, 2200, $targetFormat, 92);
            self::resizeAndWrite($source, dirname(__DIR__, 2) . '/uploads/' . $thumbRelative, 720, $targetFormat, 90);
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

    private static function resizeAndWrite(\GdImage $source, string $targetPath, int $maxWidth, string $format, int $quality): void
    {
        $width = imagesx($source);
        $height = imagesy($source);
        $ratio = min(1, $maxWidth / max(1, $width));
        $newWidth = (int) round($width * $ratio);
        $newHeight = (int) round($height * $ratio);

        $canvas = imagecreatetruecolor($newWidth, $newHeight);

        if ($format === 'png') {
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
            imagefilledrectangle($canvas, 0, 0, $newWidth, $newHeight, $transparent);
        } else {
            $background = imagecolorallocate($canvas, 0, 0, 0);
            imagefilledrectangle($canvas, 0, 0, $newWidth, $newHeight, $background);
            imagealphablending($canvas, true);
        }

        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        $written = match ($format) {
            'png' => imagepng($canvas, $targetPath, self::pngCompressionLevel($quality)),
            default => imagejpeg($canvas, $targetPath, max(88, min(100, $quality))),
        };

        if (!$written) {
            imagedestroy($canvas);
            throw new \RuntimeException('Impossible d’écrire l’image optimisée.');
        }

        imagedestroy($canvas);
    }

    private static function outputFormatForMime(string $mime): string
    {
        return match ($mime) {
            'image/png' => 'png',
            default => 'jpeg',
        };
    }

    private static function extensionForFormat(string $format): string
    {
        return $format === 'png' ? 'png' : 'jpg';
    }

    private static function pngCompressionLevel(int $quality): int
    {
        $quality = max(0, min(100, $quality));

        return match (true) {
            $quality >= 95 => 1,
            $quality >= 90 => 2,
            $quality >= 85 => 3,
            default => 4,
        };
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
