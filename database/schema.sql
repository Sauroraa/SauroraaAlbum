CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'super_admin',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(190) NOT NULL,
    slug VARCHAR(190) NOT NULL UNIQUE,
    event_date DATE NOT NULL,
    year SMALLINT NOT NULL,
    location VARCHAR(190) NOT NULL,
    description TEXT NULL,
    cover_photo_id INT UNSIGNED NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS photos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id INT UNSIGNED NOT NULL,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(255) NOT NULL,
    thumbnail_path VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255) NULL,
    position INT NOT NULL DEFAULT 0,
    is_visible TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_photos_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

ALTER TABLE events
    ADD CONSTRAINT fk_events_cover_photo
    FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS settings (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(190) NOT NULL UNIQUE,
    setting_value TEXT NULL
);

CREATE TABLE IF NOT EXISTS site_visits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visitor_key VARCHAR(190) NOT NULL,
    page_path VARCHAR(255) NOT NULL,
    visit_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_site_visit_per_day (visitor_key, visit_date),
    KEY idx_site_visits_date (visit_date)
);

CREATE TABLE IF NOT EXISTS photo_views (
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
);

CREATE TABLE IF NOT EXISTS photo_downloads (
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
);
