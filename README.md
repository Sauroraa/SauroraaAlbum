# album.sauroraa.be

Base MVP pour la galerie premium des archives photo Sauroraa.

## Stack

- Frontend: React + Vite + React Router
- Backend: PHP 8.2 API REST légère
- Base de données: MariaDB
- Infra: Docker Compose + Nginx + PHP-FPM

## Démarrage local

1. Copier `.env.example` vers `.env`
2. Adapter les variables si nécessaire
3. Lancer `docker compose up -d --build`

Le site sera accessible sur `http://localhost:8080`.

Adminer est disponible avec `docker compose --profile dev up -d adminer`.

## Connexion admin par défaut

- Email: valeur de `ADMIN_BOOTSTRAP_EMAIL`
- Mot de passe: valeur de `ADMIN_BOOTSTRAP_PASSWORD`

Pensez à remplacer ce compte avant mise en production.

## MVP couvert

- accueil premium
- archives par année
- liste des soirées par année
- fiche soirée avec galerie et lightbox
- login admin
- création, édition et suppression de soirées
- upload multi-photos
- sélection de photo de couverture
- structure Docker prête pour Debian 12

## Suite logique

- sitemap / robots / Open Graph détaillé
- drag and drop pour l’ordre des photos
- rate limiting sur le login
- gestion SEO admin
- sauvegardes automatiques et monitoring
