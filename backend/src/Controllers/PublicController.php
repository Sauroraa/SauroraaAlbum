<?php

namespace App\Controllers;

use PDO;

class PublicController
{
    public function __construct(private PDO $db)
    {
    }

    public function downloadPhoto(int $photoId): void
    {
        $stmt = $this->db->prepare(
            'SELECT p.id,
                    p.filename,
                    p.filepath,
                    e.year,
                    e.slug
             FROM photos p
             INNER JOIN events e ON e.id = p.event_id
             WHERE p.id = :id AND p.is_visible = 1 AND e.is_published = 1
             LIMIT 1'
        );
        $stmt->execute(['id' => $photoId]);
        $photo = $stmt->fetch();

        if (!$photo) {
            http_response_code(404);
            exit('Fichier introuvable.');
        }

        $originalPath = dirname(__DIR__, 2) . '/uploads/events/' . $photo['year'] . '/' . $photo['slug'] . '/original/' . $photo['filename'];
        $fallbackPath = dirname(__DIR__, 2) . '/uploads/' . $photo['filepath'];
        $path = is_file($originalPath) ? $originalPath : $fallbackPath;

        if (!is_file($path)) {
            http_response_code(404);
            exit('Fichier introuvable.');
        }

        $mime = $this->detectMime($path);

        if ($mime === 'image/png' || $mime === 'image/jpeg') {
            $downloadName = $this->downloadNameForPath($photo['filename'], $mime);
            $this->streamBinaryDownload($path, $downloadName, $mime);
        }

        $source = $this->createImageResource($path, $mime);
        if (!$source) {
            $downloadName = $this->downloadNameForPath($photo['filename'], 'image/jpeg');
            $this->streamBinaryDownload($path, $downloadName, $mime);
        }

        $downloadName = $this->downloadNameForPath($photo['filename'], 'image/jpeg');
        $this->streamJpegDownload($source, $downloadName, 100);
    }

    public function years(): void
    {
        $rows = $this->db->query(
            'SELECT year, COUNT(*) AS event_count
             FROM events
             WHERE is_published = 1
             GROUP BY year
             ORDER BY year DESC'
        )->fetchAll();

        foreach ($rows as &$row) {
            $cover = $this->db->prepare(
                'SELECT COALESCE(cp.thumbnail_path, fp.thumbnail_path) AS cover_path
                 FROM events e
                 LEFT JOIN photos cp ON cp.id = e.cover_photo_id
                 LEFT JOIN photos fp ON fp.event_id = e.id AND fp.is_visible = 1
                 WHERE e.year = :year AND e.is_published = 1
                 ORDER BY e.event_date DESC, fp.position ASC, fp.id ASC
                 LIMIT 1'
            );
            $cover->execute(['year' => $row['year']]);
            $image = $cover->fetchColumn();
            $row['cover_image_url'] = $image ? assetUrl('uploads/' . $image) : null;
        }

        jsonResponse(['data' => $rows]);
    }

    public function events(?int $year = null, bool $includeDrafts = false): void
    {
        $conditions = [];
        $params = [];

        if (!$includeDrafts) {
            $conditions[] = 'e.is_published = 1';
        }

        if ($year) {
            $conditions[] = 'e.year = :year';
            $params['year'] = $year;
        }

        $search = $_GET['search'] ?? null;
        if ($search) {
            $conditions[] = '(e.title LIKE :search OR e.location LIKE :search)';
            $params['search'] = '%' . $search . '%';
        }

        $sql = 'SELECT e.*,
                       COALESCE(cp.filepath, fp.filepath) AS cover_path,
                       COALESCE(cp.thumbnail_path, fp.thumbnail_path) AS cover_thumb
                FROM events e
                LEFT JOIN photos cp ON cp.id = e.cover_photo_id
                LEFT JOIN photos fp ON fp.id = (
                    SELECT id
                    FROM photos
                    WHERE event_id = e.id AND is_visible = 1
                    ORDER BY position ASC, id ASC
                    LIMIT 1
                )';

        if ($conditions) {
            $sql .= ' WHERE ' . implode(' AND ', $conditions);
        }

        $sql .= ' ORDER BY e.event_date DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $events = array_map([$this, 'mapEventCard'], $stmt->fetchAll());

        if ($includeDrafts) {
            foreach ($events as &$event) {
                $event['photos'] = $this->photosForEvent($event['id']);
            }
        }

        jsonResponse(['data' => $events]);
    }

    public function eventBySlug(string $slug, bool $includeDrafts = false): void
    {
        $sql = 'SELECT e.*,
                       COALESCE(cp.filepath, fp.filepath) AS cover_path,
                       COALESCE(cp.thumbnail_path, fp.thumbnail_path) AS cover_thumb
                FROM events e
                LEFT JOIN photos cp ON cp.id = e.cover_photo_id
                LEFT JOIN photos fp ON fp.id = (
                    SELECT id
                    FROM photos
                    WHERE event_id = e.id AND is_visible = 1
                    ORDER BY position ASC, id ASC
                    LIMIT 1
                )
                WHERE e.slug = :slug';

        if (!$includeDrafts) {
            $sql .= ' AND e.is_published = 1';
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute(['slug' => $slug]);
        $event = $stmt->fetch();

        if (!$event) {
            jsonResponse(['message' => 'Soirée introuvable.'], 404);
        }

        $payload = $this->mapEventCard($event);
        $payload['description'] = $event['description'];
        $payload['cover_photo_id'] = $event['cover_photo_id'] ? (int) $event['cover_photo_id'] : null;
        $payload['photos'] = $this->photosForEvent((int) $event['id']);

        jsonResponse(['data' => $payload]);
    }

    private function photosForEvent(int $eventId): array
    {
        $photos = $this->db->prepare(
            'SELECT p.id,
                    p.filename,
                    p.alt_text,
                    p.position,
                    p.filepath,
                    p.thumbnail_path,
                    e.year,
                    e.slug,
                    (SELECT COUNT(*) FROM photo_views pv WHERE pv.photo_id = p.id) AS views_count,
                    (SELECT COUNT(*) FROM photo_downloads pd WHERE pd.photo_id = p.id) AS downloads_count
             FROM photos
             AS p
             INNER JOIN events e ON e.id = p.event_id
             WHERE p.event_id = :event_id AND p.is_visible = 1
             ORDER BY p.position ASC, p.id ASC'
        );
        $photos->execute(['event_id' => $eventId]);

        return array_map(function (array $photo): array {
            return [
                'id' => (int) $photo['id'],
                'filename' => $photo['filename'],
                'alt_text' => $photo['alt_text'],
                'position' => (int) $photo['position'],
                'url' => assetUrl('uploads/' . $photo['filepath']),
                'download_url' => assetUrl('api/photos/' . $photo['id'] . '/download'),
                'thumbnail_url' => assetUrl('uploads/' . $photo['thumbnail_path']),
                'views_count' => (int) ($photo['views_count'] ?? 0),
                'downloads_count' => (int) ($photo['downloads_count'] ?? 0),
            ];
        }, $photos->fetchAll());
    }

    private function mapEventCard(array $event): array
    {
        return [
            'id' => (int) $event['id'],
            'title' => $event['title'],
            'slug' => $event['slug'],
            'event_date' => $event['event_date'],
            'year' => (int) $event['year'],
            'location' => $event['location'],
            'description' => $event['description'],
            'cover_photo_id' => $event['cover_photo_id'] ? (int) $event['cover_photo_id'] : null,
            'is_published' => (bool) $event['is_published'],
            'cover_image_url' => $event['cover_path'] ? assetUrl('uploads/' . $event['cover_path']) : null,
            'cover_thumbnail_url' => $event['cover_thumb'] ? assetUrl('uploads/' . $event['cover_thumb']) : null,
        ];
    }

    private function detectMime(string $path): string
    {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $detected = finfo_file($finfo, $path);
                finfo_close($finfo);
                if (is_string($detected) && $detected !== '') {
                    return $detected;
                }
            }
        }

        return match (strtolower((string) pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };
    }

    private function createImageResource(string $path, string $mime): ?\GdImage
    {
        return match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path) ?: null,
            'image/png' => @imagecreatefrompng($path) ?: null,
            'image/webp' => function_exists('imagecreatefromwebp') ? (@imagecreatefromwebp($path) ?: null) : null,
            default => null,
        };
    }

    private function downloadNameForPath(string $preferredName, string $mime): string
    {
        $baseName = pathinfo($preferredName, PATHINFO_FILENAME);
        $baseName = $this->sanitizeDownloadName($baseName ?: 'sauroraa-photo');

        return $baseName . match ($mime) {
            'image/png' => '.png',
            default => '.jpg',
        };
    }

    private function sanitizeDownloadName(string $value): string
    {
        $value = trim(preg_replace('/[^A-Za-z0-9._-]+/', '-', $value) ?? 'sauroraa-photo', '-._');

        return $value !== '' ? $value : 'sauroraa-photo';
    }

    private function streamBinaryDownload(string $path, string $downloadName, string $mime): never
    {
        header('Content-Description: File Transfer');
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . (string) filesize($path));
        header($this->contentDispositionHeader($downloadName));
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');

        readfile($path);
        exit;
    }

    private function streamJpegDownload(\GdImage $image, string $downloadName, int $quality): never
    {
        header('Content-Description: File Transfer');
        header('Content-Type: image/jpeg');
        header($this->contentDispositionHeader($downloadName));
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');

        imageinterlace($image, false);
        imagejpeg($image, null, max(95, min(100, $quality)));
        imagedestroy($image);
        exit;
    }

    private function contentDispositionHeader(string $downloadName): string
    {
        $asciiName = preg_replace('/[^A-Za-z0-9._-]/', '-', $downloadName) ?: 'download.jpg';

        return sprintf(
            "Content-Disposition: attachment; filename=\"%s\"; filename*=UTF-8''%s",
            $asciiName,
            rawurlencode($downloadName)
        );
    }
}
