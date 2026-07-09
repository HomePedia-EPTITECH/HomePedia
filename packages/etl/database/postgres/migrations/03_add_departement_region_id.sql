-- Migration 03 : lien région porté par le département.
-- Le back joint bdd.region via `departement.region_id` ; la colonne manquait,
-- ce qui cassait la requête /communes (column dept.region_id does not exist).
-- Type INTEGER pour matcher region.numero_region.

ALTER TABLE bdd.departement ADD COLUMN IF NOT EXISTS region_id INTEGER NULL;
