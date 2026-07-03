-- Migration 02 : coordonnées GPS des communes (centroïde des transactions DVF, Mongo real_estate_history)

ALTER TABLE bdd.commune ADD COLUMN IF NOT EXISTS latitude FLOAT NULL;
ALTER TABLE bdd.commune ADD COLUMN IF NOT EXISTS longitude FLOAT NULL;
