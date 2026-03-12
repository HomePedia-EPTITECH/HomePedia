-- Migration 01 : schéma homepedia et table communes (schéma complet actuel)
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

    -- Démographie détaillée
    estimation_pop_2026      TEXT       NULL,
    estimation_pop_2025      TEXT       NULL,
    part_0_14_ans            TEXT       NULL,
    part_15_29_ans           TEXT       NULL,
    part_30_44_ans           TEXT       NULL,
    part_45_59_ans           TEXT       NULL,
    part_60_74_ans           TEXT       NULL,
    part_75_89_ans           TEXT       NULL,
    part_90_plus             TEXT       NULL,
    part_cadres              TEXT       NULL,
    part_retraites           TEXT       NULL,
    part_employes            TEXT       NULL,
    part_ouvriers            TEXT       NULL,
    part_sans_diplome        TEXT       NULL,
    part_bac5_plus           TEXT       NULL,
    part_couple_avec_enfant  TEXT       NULL,
    part_personnes_seules    TEXT       NULL,

    -- Élections
    participation_1er_tour   TEXT       NULL,
    participation_2nd_tour   TEXT       NULL,
    inscrits_election        TEXT       NULL,

    -- Territoire / administration
    code_postal              TEXT       NULL,
    nom_region               TEXT       NULL,
    nom_departement          TEXT       NULL,
    nom_metropole            TEXT       NULL,
    nom_maire                TEXT       NULL,

    CONSTRAINT pk_homepedia_communes PRIMARY KEY (com, nccenr)
);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_nccenr
    ON homepedia.communes (nccenr);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_nb_habitant
    ON homepedia.communes (nb_habitant);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_note_moyenne_globale
    ON homepedia.communes (note_moyenne_globale);
