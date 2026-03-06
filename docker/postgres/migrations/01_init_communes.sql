-- Migration 01 : structure minimale pour le starter project
-- Crée le schéma et la table utilisée par le script Python.

CREATE SCHEMA IF NOT EXISTS bdd;

CREATE TABLE IF NOT EXISTS bdd.v_commune_2023 (
    com                VARCHAR(10)   NOT NULL,
    nccenr             TEXT          NOT NULL,

    -- Champs enrichis par le scraper (stockés en texte pour rester flexibles)
    nb_habitant        TEXT          NULL,
    age_moyen          TEXT          NULL,
    pop_active         TEXT          NULL,

    score_securite      TEXT         NULL,
    score_environnement TEXT         NULL,
    score_vie_pratique  TEXT         NULL,
    score_loisirs       TEXT         NULL,
    score_sante         TEXT         NULL,
    score_transports    TEXT         NULL,
    score_education     TEXT         NULL,

    CONSTRAINT pk_v_commune_2023 PRIMARY KEY (com, nccenr)
);

-- Index pour les recherches par nom de commune et quelques scores.
CREATE INDEX IF NOT EXISTS idx_v_commune_2023_nccenr
    ON bdd.v_commune_2023 (nccenr);

CREATE INDEX IF NOT EXISTS idx_v_commune_2023_score_securite
    ON bdd.v_commune_2023 (score_securite);

CREATE INDEX IF NOT EXISTS idx_v_commune_2023_score_environnement
    ON bdd.v_commune_2023 (score_environnement);

