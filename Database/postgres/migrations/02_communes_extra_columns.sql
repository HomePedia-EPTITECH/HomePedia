-- Migration 02 : ajout de ~32 colonnes (démographie détaillée, élections, territoire, services)
-- Total ~50 infos par commune.

ALTER TABLE homepedia.communes
  ADD COLUMN IF NOT EXISTS estimation_pop_2026    TEXT NULL,
  ADD COLUMN IF NOT EXISTS estimation_pop_2025    TEXT NULL,

  ADD COLUMN IF NOT EXISTS part_0_14_ans          TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_15_29_ans         TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_30_44_ans         TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_45_59_ans         TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_60_74_ans         TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_75_89_ans         TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_90_plus            TEXT NULL,

  ADD COLUMN IF NOT EXISTS part_cadres            TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_retraites         TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_employes          TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_ouvriers          TEXT NULL,

  ADD COLUMN IF NOT EXISTS part_sans_diplome      TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_bac5_plus         TEXT NULL,

  ADD COLUMN IF NOT EXISTS part_couple_avec_enfant TEXT NULL,
  ADD COLUMN IF NOT EXISTS part_personnes_seules  TEXT NULL,

  ADD COLUMN IF NOT EXISTS participation_1er_tour TEXT NULL,
  ADD COLUMN IF NOT EXISTS participation_2nd_tour TEXT NULL,
  ADD COLUMN IF NOT EXISTS inscrits_election      TEXT NULL,

  ADD COLUMN IF NOT EXISTS code_postal            TEXT NULL,
  ADD COLUMN IF NOT EXISTS nom_region             TEXT NULL,
  ADD COLUMN IF NOT EXISTS nom_departement        TEXT NULL,
  ADD COLUMN IF NOT EXISTS nom_metropole          TEXT NULL,
  ADD COLUMN IF NOT EXISTS nom_maire              TEXT NULL,

  ADD COLUMN IF NOT EXISTS nb_restaurant          TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_boulangerie         TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_bibliotheque        TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_cinema              TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_creche              TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_ecole_maternelle_pub TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_ecole_primaire_pub  TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_college_pub         TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_lycee_pub           TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_hypermarché         TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_supermarche         TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_pharmacie           TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_hopital             TEXT NULL,
  ADD COLUMN IF NOT EXISTS nb_dentiste            TEXT NULL;
