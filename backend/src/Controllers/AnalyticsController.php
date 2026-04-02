<?php

namespace App\Controllers;

use PDO;

class AnalyticsController
{
    public function __construct(private PDO $db)
    {
        $this->ensureTables();
    }

    public function trackVisit(array $payload): void
    {
        $visitorKey = trim((string) ($payload['visitor_key'] ?? ''));
        $pagePath = trim((string) ($payload['page_path'] ?? '/'));

        if ($visitorKey === '') {
            jsonResponse(['message' => 'Visiteur requis.'], 422);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO site_visits (visitor_key, page_path, visit_date)
             VALUES (:visitor_key, :page_path, CURDATE())
             ON DUPLICATE KEY UPDATE page_path = VALUES(page_path)'
        );
        $stmt->execute([
            'visitor_key' => substr($visitorKey, 0, 190),
            'page_path' => substr($pagePath ?: '/', 0, 255),
        ]);

        jsonResponse(['message' => 'Visite comptabilisée.'], 201);
    }

    public function trackPhotoView(array $payload): void
    {
        $visitorKey = trim((string) ($payload['visitor_key'] ?? ''));
        $photoId = (int) ($payload['photo_id'] ?? 0);

        if ($visitorKey === '' || $photoId <= 0) {
            jsonResponse(['message' => 'Visiteur et photo requis.'], 422);
        }

        $photo = $this->db->prepare('SELECT id, event_id FROM photos WHERE id = :id LIMIT 1');
        $photo->execute(['id' => $photoId]);
        $row = $photo->fetch();

        if (!$row) {
            jsonResponse(['message' => 'Photo introuvable.'], 404);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO photo_views (photo_id, event_id, visitor_key, view_date)
             VALUES (:photo_id, :event_id, :visitor_key, CURDATE())
             ON DUPLICATE KEY UPDATE created_at = created_at'
        );
        $stmt->execute([
            'photo_id' => $photoId,
            'event_id' => (int) $row['event_id'],
            'visitor_key' => substr($visitorKey, 0, 190),
        ]);

        jsonResponse(['message' => 'Vue photo comptabilisée.'], 201);
    }

    public function trackPhotoDownload(array $payload): void
    {
        $visitorKey = trim((string) ($payload['visitor_key'] ?? ''));
        $photoId = (int) ($payload['photo_id'] ?? 0);

        if ($visitorKey === '' || $photoId <= 0) {
            jsonResponse(['message' => 'Visiteur et photo requis.'], 422);
        }

        $photo = $this->db->prepare('SELECT id, event_id FROM photos WHERE id = :id LIMIT 1');
        $photo->execute(['id' => $photoId]);
        $row = $photo->fetch();

        if (!$row) {
            jsonResponse(['message' => 'Photo introuvable.'], 404);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO photo_downloads (photo_id, event_id, visitor_key, download_date)
             VALUES (:photo_id, :event_id, :visitor_key, CURDATE())
             ON DUPLICATE KEY UPDATE created_at = created_at'
        );
        $stmt->execute([
            'photo_id' => $photoId,
            'event_id' => (int) $row['event_id'],
            'visitor_key' => substr($visitorKey, 0, 190),
        ]);

        jsonResponse(['message' => 'Téléchargement comptabilisé.'], 201);
    }

    public function publicSummary(): void
    {
        jsonResponse([
            'data' => [
                'visitors_total' => (int) $this->db->query('SELECT COUNT(DISTINCT visitor_key) FROM site_visits')->fetchColumn(),
                'photo_views_total' => (int) $this->db->query('SELECT COUNT(*) FROM photo_views')->fetchColumn(),
                'downloads_total' => (int) $this->db->query('SELECT COUNT(*) FROM photo_downloads')->fetchColumn(),
            ],
        ]);
    }

    public function summary(): void
    {
        $summary = [
            'visitors_total' => (int) $this->db->query('SELECT COUNT(DISTINCT visitor_key) FROM site_visits')->fetchColumn(),
            'visitors_today' => (int) $this->db->query('SELECT COUNT(DISTINCT visitor_key) FROM site_visits WHERE visit_date = CURDATE()')->fetchColumn(),
            'photo_views_total' => (int) $this->db->query('SELECT COUNT(*) FROM photo_views')->fetchColumn(),
            'photo_views_today' => (int) $this->db->query('SELECT COUNT(*) FROM photo_views WHERE view_date = CURDATE()')->fetchColumn(),
            'downloads_total' => (int) $this->db->query('SELECT COUNT(*) FROM photo_downloads')->fetchColumn(),
            'downloads_today' => (int) $this->db->query('SELECT COUNT(*) FROM photo_downloads WHERE download_date = CURDATE()')->fetchColumn(),
            'top_photos' => [],
            'top_events' => [],
        ];

        $topPhotos = $this->db->query(
            'SELECT p.id,
                    p.alt_text,
                    p.thumbnail_path,
                    p.event_id,
                    e.title AS event_title,
                    COUNT(DISTINCT v.id) AS views_count,
                    COUNT(DISTINCT d.id) AS downloads_count
             FROM photos p
             INNER JOIN events e ON e.id = p.event_id
             LEFT JOIN photo_views v ON v.photo_id = p.id
             LEFT JOIN photo_downloads d ON d.photo_id = p.id
             GROUP BY p.id, p.alt_text, p.thumbnail_path, p.event_id, e.title
             ORDER BY views_count DESC, downloads_count DESC, p.id DESC
             LIMIT 6'
        )->fetchAll();

        $summary['top_photos'] = array_map(function (array $photo): array {
            return [
                'id' => (int) $photo['id'],
                'event_id' => (int) $photo['event_id'],
                'event_title' => $photo['event_title'],
                'alt_text' => $photo['alt_text'],
                'thumbnail_url' => $photo['thumbnail_path'] ? baseUrl('uploads/' . $photo['thumbnail_path']) : null,
                'views_count' => (int) $photo['views_count'],
                'downloads_count' => (int) $photo['downloads_count'],
            ];
        }, $topPhotos);

        $topEvents = $this->db->query(
            'SELECT e.id,
                    e.title,
                    e.slug,
                    COUNT(DISTINCT v.id) AS views_count,
                    COUNT(DISTINCT d.id) AS downloads_count
             FROM events e
             LEFT JOIN photo_views v ON v.event_id = e.id
             LEFT JOIN photo_downloads d ON d.event_id = e.id
             GROUP BY e.id, e.title, e.slug
             ORDER BY views_count DESC, downloads_count DESC, e.id DESC
             LIMIT 6'
        )->fetchAll();

        $summary['top_events'] = array_map(function (array $event): array {
            return [
                'id' => (int) $event['id'],
                'title' => $event['title'],
                'slug' => $event['slug'],
                'views_count' => (int) $event['views_count'],
                'downloads_count' => (int) $event['downloads_count'],
            ];
        }, $topEvents);

        jsonResponse(['data' => $summary]);
    }

    private function ensureTables(): void
    {
        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS site_visits (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                visitor_key VARCHAR(190) NOT NULL,
                page_path VARCHAR(255) NOT NULL,
                visit_date DATE NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_site_visit_per_day (visitor_key, visit_date),
                KEY idx_site_visits_date (visit_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS photo_views (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                photo_id INT UNSIGNED NOT NULL,
                event_id INT UNSIGNED NOT NULL,
                visitor_key VARCHAR(190) NOT NULL,
                view_date DATE NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_photo_view_per_day (photo_id, visitor_key, view_date),
                KEY idx_photo_views_date (view_date),
                KEY idx_photo_views_event (event_id),
                CONSTRAINT fk_photo_views_photo FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
                CONSTRAINT fk_photo_views_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );

        $this->db->exec(
            'CREATE TABLE IF NOT EXISTS photo_downloads (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                photo_id INT UNSIGNED NOT NULL,
                event_id INT UNSIGNED NOT NULL,
                visitor_key VARCHAR(190) NOT NULL,
                download_date DATE NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uniq_photo_download_per_day (photo_id, visitor_key, download_date),
                KEY idx_photo_downloads_date (download_date),
                KEY idx_photo_downloads_event (event_id),
                CONSTRAINT fk_photo_downloads_photo FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
                CONSTRAINT fk_photo_downloads_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }
}
