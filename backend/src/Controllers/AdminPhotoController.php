<?php

namespace App\Controllers;

use App\Services\ImageService;
use PDO;

class AdminPhotoController
{
    public function __construct(private PDO $db)
    {
    }

    public function upload(): void
    {
        $eventId = (int) ($_POST['event_id'] ?? 0);

        if (!$eventId) {
            jsonResponse(['message' => 'Event requis.'], 422);
        }

        $event = $this->db->prepare('SELECT id, year, slug FROM events WHERE id = :id');
        $event->execute(['id' => $eventId]);
        $row = $event->fetch();

        if (!$row) {
            jsonResponse(['message' => 'Soirée introuvable.'], 404);
        }

        $files = $_FILES['photos'] ?? null;

        if (!$files) {
            jsonResponse(['message' => 'Aucun fichier reçu.'], 422);
        }

        $created = [];
        $count = is_array($files['name']) ? count($files['name']) : 0;

        for ($i = 0; $i < $count; $i++) {
            $file = [
                'name' => $files['name'][$i],
                'type' => $files['type'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'error' => $files['error'][$i],
                'size' => $files['size'][$i],
            ];

            try {
                $stored = ImageService::storeEventImage($file, (int) $row['year'], $row['slug']);
            } catch (\RuntimeException $exception) {
                jsonResponse(['message' => $exception->getMessage()], 422);
            }

            $position = (int) $this->db->query('SELECT COALESCE(MAX(position), 0) + 1 FROM photos WHERE event_id = ' . $eventId)->fetchColumn();

            $stmt = $this->db->prepare(
                'INSERT INTO photos (event_id, filename, filepath, thumbnail_path, alt_text, position, is_visible)
                 VALUES (:event_id, :filename, :filepath, :thumbnail_path, :alt_text, :position, 1)'
            );
            $stmt->execute([
                'event_id' => $eventId,
                'filename' => $stored['filename'],
                'filepath' => $stored['filepath'],
                'thumbnail_path' => $stored['thumbnail_path'],
                'alt_text' => pathinfo($stored['filename'], PATHINFO_FILENAME),
                'position' => $position,
            ]);

            $photoId = (int) $this->db->lastInsertId();
            $created[] = [
                'id' => $photoId,
                'url' => assetUrl('uploads/' . $stored['filepath']),
                'thumbnail_url' => assetUrl('uploads/' . $stored['thumbnail_path']),
            ];
        }

        $cover = $this->db->prepare('SELECT cover_photo_id FROM events WHERE id = :id');
        $cover->execute(['id' => $eventId]);
        if (!$cover->fetchColumn() && isset($created[0]['id'])) {
            $setCover = $this->db->prepare('UPDATE events SET cover_photo_id = :cover WHERE id = :id');
            $setCover->execute(['cover' => $created[0]['id'], 'id' => $eventId]);
        }

        jsonResponse(['data' => $created], 201);
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare('DELETE FROM photos WHERE id = :id');
        $stmt->execute(['id' => $id]);

        jsonResponse(['message' => 'Photo supprimée.']);
    }

    public function reorder(array $payload): void
    {
        $items = $payload['photos'] ?? [];

        if (!is_array($items) || !$items) {
            jsonResponse(['message' => 'Liste de photos requise.'], 422);
        }

        $stmt = $this->db->prepare('UPDATE photos SET position = :position WHERE id = :id');

        foreach ($items as $item) {
            $stmt->execute([
                'position' => (int) ($item['position'] ?? 0),
                'id' => (int) ($item['id'] ?? 0),
            ]);
        }

        jsonResponse(['message' => 'Ordre mis à jour.']);
    }
}
