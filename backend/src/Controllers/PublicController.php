<?php

namespace App\Controllers;

use PDO;

class PublicController
{
    public function __construct(private PDO $db)
    {
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
            'SELECT id, alt_text, position, filepath, thumbnail_path
             FROM photos
             WHERE event_id = :event_id AND is_visible = 1
             ORDER BY position ASC, id ASC'
        );
        $photos->execute(['event_id' => $eventId]);

        return array_map(function (array $photo): array {
            return [
                'id' => (int) $photo['id'],
                'alt_text' => $photo['alt_text'],
                'position' => (int) $photo['position'],
                'url' => assetUrl('uploads/' . $photo['filepath']),
                'thumbnail_url' => assetUrl('uploads/' . $photo['thumbnail_path']),
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
}
