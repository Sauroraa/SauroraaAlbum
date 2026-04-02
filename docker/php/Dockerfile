FROM php:8.2-fpm-alpine

RUN apk add --no-cache \
        freetype-dev \
        icu-dev \
        jpeg-dev \
        libpng-dev \
        libwebp-dev \
        oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install gd intl pdo pdo_mysql

WORKDIR /var/www/backend

COPY backend/ /var/www/backend
COPY docker/php/uploads.ini /usr/local/etc/php/conf.d/uploads.ini

CMD ["php-fpm", "-F"]
