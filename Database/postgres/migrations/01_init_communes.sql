-- Migration 01 : schéma homepedia et table communes (18 colonnes scrapées)
-- Contexte : référentiel des communes France métropolitaine pour Homepedia.

CREATE SCHEMA IF NOT EXISTS homepedia;

CREATE TABLE IF NOT EXISTS homepedia.communes (
    com                     VARCHAR(10) NOT NULL,
    nccenr                  TEXT        NOT NULL,

    -- Démographie (page ville, tableau bloc_chiffre)
    nb_habitant             TEXT        NULL,
    age_moyen               TEXT        NULL,
    pop_active              TEXT        NULL,
    taux_chomage            TEXT        NULL,
    pop_densite             TEXT        NULL,
    revenu_moyen            TEXT        NULL,

    -- Géographie
    superficie_km2          TEXT        NULL,

    -- Sécurité (page ville, section Sécurité)
    agressions              TEXT        NULL,
    cambriolages            TEXT        NULL,
    vols_degradations       TEXT        NULL,
    stupefiants             TEXT        NULL,

    -- Avis (page avis)
    note_moyenne_globale    TEXT        NULL,
    nb_avis                 TEXT        NULL,
    score_securite          TEXT        NULL,
    score_education         TEXT        NULL,
    score_loisirs           TEXT        NULL,
    score_environnement     TEXT        NULL,
    score_vie_pratique      TEXT        NULL,

    CONSTRAINT pk_homepedia_communes PRIMARY KEY (com, nccenr)
);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_nccenr
    ON homepedia.communes (nccenr);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_nb_habitant
    ON homepedia.communes (nb_habitant);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_note_moyenne_globale
    ON homepedia.communes (note_moyenne_globale);
