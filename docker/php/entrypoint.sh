#!/bin/sh
set -eu

UPLOAD_DIR="/var/www/backend/uploads"

mkdir -p "$UPLOAD_DIR"
chmod -R 0777 "$UPLOAD_DIR" || true
chown -R www-data:www-data "$UPLOAD_DIR" || true

exec php-fpm -F
