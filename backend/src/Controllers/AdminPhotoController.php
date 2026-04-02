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
        $setAsCover = filter_var($_POST['set_as_cover'] ?? false, FILTER_VALIDATE_BOOL);

        if (!$eventId) {
            jsonResponse(['message' => 'Event requis.'], 422);
        }

        $event = $this->db->prepare('SELECT id, year, slug FROM events WHERE id = :id');
        $event->execute(['id' => $eventId]);
        $row = $event->fetch();

        if (!$row) {
            jsonResponse(['message' => 'Soirée introuvable.'], 404);
        }

        $files = $this->normalizeFiles($_FILES['photos'] ?? $_FILES['photo'] ?? null);

        if (!$files) {
            jsonResponse(['message' => 'Aucun fichier reçu.'], 422);
        }

        $created = [];

        try {
            $this->db->beginTransaction();

            foreach ($files as $file) {
                $stored = ImageService::storeEventImage($file, (int) $row['year'], $row['slug']);

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
                    'filename' => $stored['filename'],
                    'alt_text' => pathinfo($stored['filename'], PATHINFO_FILENAME),
                    'is_visible' => true,
                    'position' => $position,
                    'url' => assetUrl('uploads/' . $stored['filepath']),
                    'thumbnail_url' => assetUrl('uploads/' . $stored['thumbnail_path']),
                ];
            }

            $cover = $this->db->prepare('SELECT cover_photo_id FROM events WHERE id = :id');
            $cover->execute(['id' => $eventId]);
            if (($setAsCover || !$cover->fetchColumn()) && isset($created[0]['id'])) {
                $setCover = $this->db->prepare('UPDATE events SET cover_photo_id = :cover WHERE id = :id');
                $setCover->execute(['cover' => $created[0]['id'], 'id' => $eventId]);
            }

            $this->db->commit();
        } catch (\Throwable $exception) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }

            error_log('[upload] ' . $exception->getMessage());
            jsonResponse(['message' => $exception->getMessage()], 422);
        }

        jsonResponse([
            'data' => $created,
            'meta' => $this->eventMediaState($eventId),
        ], 201);
    }

    private function normalizeFiles(mixed $files): array
    {
        if (!is_array($files) || !isset($files['name'], $files['tmp_name'], $files['error'], $files['size'])) {
            return [];
        }

        if (!is_array($files['name'])) {
            return [[
                'name' => $files['name'],
                'type' => $files['type'] ?? '',
                'tmp_name' => $files['tmp_name'],
                'error' => $files['error'],
                'size' => $files['size'],
            ]];
        }

        $normalized = [];
        $count = count($files['name']);
        for ($i = 0; $i < $count; $i++) {
            $normalized[] = [
                'name' => $files['name'][$i],
                'type' => $files['type'][$i] ?? '',
                'tmp_name' => $files['tmp_name'][$i],
                'error' => $files['error'][$i],
                'size' => $files['size'][$i],
            ];
        }

        return $normalized;
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

    private function eventMediaState(int $eventId): array
    {
        $event = $this->db->prepare(
            'SELECT e.cover_photo_id,
                    COALESCE(cp.filepath, fp.filepath) AS cover_image_path,
                    COALESCE(cp.thumbnail_path, fp.thumbnail_path) AS cover_thumbnail_path
             FROM events e
             LEFT JOIN photos cp ON cp.id = e.cover_photo_id
             LEFT JOIN photos fp ON fp.id = (
                 SELECT id
                 FROM photos
                 WHERE event_id = e.id AND is_visible = 1
                 ORDER BY position ASC, id ASC
                 LIMIT 1
             )
             WHERE e.id = :id'
        );
        $event->execute(['id' => $eventId]);
        $row = $event->fetch() ?: [];

        $photos = $this->db->prepare(
            'SELECT id, filename, alt_text, position, is_visible, filepath, thumbnail_path
             FROM photos
             WHERE event_id = :event_id
             ORDER BY position ASC, id ASC'
        );
        $photos->execute(['event_id' => $eventId]);

        return [
            'cover_photo_id' => !empty($row['cover_photo_id']) ? (int) $row['cover_photo_id'] : null,
            'cover_image_url' => !empty($row['cover_image_path']) ? assetUrl('uploads/' . $row['cover_image_path']) : null,
            'cover_thumbnail_url' => !empty($row['cover_thumbnail_path']) ? assetUrl('uploads/' . $row['cover_thumbnail_path']) : null,
            'photos' => array_map(static function (array $photo): array {
                return [
                    'id' => (int) $photo['id'],
                    'filename' => $photo['filename'],
                    'alt_text' => $photo['alt_text'],
                    'position' => (int) $photo['position'],
                    'is_visible' => (bool) $photo['is_visible'],
                    'url' => assetUrl('uploads/' . $photo['filepath']),
                    'thumbnail_url' => assetUrl('uploads/' . $photo['thumbnail_path']),
                ];
            }, $photos->fetchAll()),
        ];
    }
}
