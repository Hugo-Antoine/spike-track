-- Script pour ajouter une vidéo manuellement
-- Remplacez les valeurs ci-dessous avec vos données

INSERT INTO "pg-drizzle_video" (
  "name",
  "cloudinaryFolder",
  "totalFrames",
  "fps",
  "width",
  "height",
  "createdAt",
  "updatedAt"
) VALUES (
  'Match Test - France vs Italie',           -- Nom de la vidéo
  'volleyball/match_test',                   -- Dossier Cloudinary
  1000,                                       -- Nombre total de frames
  30,                                         -- FPS
  1920,                                       -- Largeur
  1080,                                       -- Hauteur
  NOW(),
  NOW()
);

-- Pour ajouter plusieurs vidéos :
-- INSERT INTO "pg-drizzle_video" (...) VALUES
--   ('Video 1', 'folder1', 500, 30, 1920, 1080, NOW(), NOW()),
--   ('Video 2', 'folder2', 750, 30, 1920, 1080, NOW(), NOW());
