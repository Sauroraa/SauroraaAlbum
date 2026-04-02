<?php

namespace App\Controllers;

use PDO;

class AdminEventController
{
    public function __construct(private PDO $db, private PublicController $publicController)
    {
    }

    public function index(): void
    {
        $this->publicController->events(null, true);
    }

    public function store(array $payload): void
    {
        $data = $this->validate($payload);
        $stmt = $this->db->prepare(
            'INSERT INTO events (title, slug, event_date, year, location, description, cover_photo_id, is_published)
             VALUES (:title, :slug, :event_date, :year, :location, :description, :cover_photo_id, :is_published)'
        );
        $stmt->execute($data);

        jsonResponse(['data' => ['id' => (int) $this->db->lastInsertId()]], 201);
    }

    public function update(int $id, array $payload): void
    {
        $data = $this->validate($payload, $id);
        $data['id'] = $id;

        $stmt = $this->db->prepare(
            'UPDATE events
             SET title = :title,
                 slug = :slug,
                 event_date = :event_date,
                 year = :year,
                 location = :location,
                 description = :description,
                 cover_photo_id = :cover_photo_id,
                 is_published = :is_published
             WHERE id = :id'
        );
        $stmt->execute($data);

        jsonResponse(['message' => 'Soirée mise à jour.']);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM events WHERE id = :id');
        $stmt->execute(['id' => $id]);

        jsonResponse(['message' => 'Soirée supprimée.']);
    }

    private function validate(array $payload, ?int $eventId = null): array
    {
        $title = trim((string) ($payload['title'] ?? ''));
        $location = trim((string) ($payload['location'] ?? ''));
        $description = trim((string) ($payload['description'] ?? ''));
        $eventDate = (string) ($payload['event_date'] ?? '');
        $slug = trim((string) ($payload['slug'] ?? ''));
        $slug = $slug !== '' ? slugify($slug) : slugify($title);
        $isPublished = !empty($payload['is_published']) ? 1 : 0;
        $coverPhotoId = !empty($payload['cover_photo_id']) ? (int) $payload['cover_photo_id'] : null;

        if (!$title || !$location || !$eventDate) {
            jsonResponse(['message' => 'Titre, date et lieu sont requis.'], 422);
        }

        $year = (int) date('Y', strtotime($eventDate));
        $params = ['slug' => $slug];
        $sql = 'SELECT id FROM events WHERE slug = :slug';

        if ($eventId) {
            $sql .= ' AND id != :id';
            $params['id'] = $eventId;
        }

        $check = $this->db->prepare($sql);
        $check->execute($params);

        if ($check->fetch()) {
            jsonResponse(['message' => 'Ce slug est déjà utilisé.'], 422);
        }

        return [
            'title' => $title,
            'slug' => $slug,
            'event_date' => $eventDate,
            'year' => $year,
            'location' => $location,
            'description' => $description ?: null,
            'cover_photo_id' => $coverPhotoId,
            'is_published' => $isPublished,
        ];
    }
}

