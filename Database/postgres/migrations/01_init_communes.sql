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

    -- Services à la population : Commerce
    nb_hypermarches                  TEXT NULL,
    nb_supermarches                  TEXT NULL,
    nb_superettes                    TEXT NULL,
    nb_boulangeries                  TEXT NULL,
    nb_boucheries                    TEXT NULL,
    nb_restaurants                   TEXT NULL,
    nb_garages                       TEXT NULL,
    nb_stations_service              TEXT NULL,
    nb_banques                       TEXT NULL,
    nb_bureaux_poste                 TEXT NULL,
    nb_coiffeurs                     TEXT NULL,
    nb_tabacs                        TEXT NULL,
    nb_bars_discotheques             TEXT NULL,
    nb_bibliotheques                 TEXT NULL,
    nb_cinemas                       TEXT NULL,
    nb_veterinaires                  TEXT NULL,

    -- Services à la population : Santé
    nb_pharmacies                    TEXT NULL,
    nb_hopitaux                      TEXT NULL,
    nb_laboratoires_analyses         TEXT NULL,
    nb_etablissements_handicapes     TEXT NULL,
    nb_ehpa                          TEXT NULL,
    nb_medecins                      TEXT NULL,
    nb_dentistes                     TEXT NULL,
    nb_chirurgiens                   TEXT NULL,
    nb_dermatologues                 TEXT NULL,
    nb_anesthesistes                 TEXT NULL,
    nb_gastroenterologues            TEXT NULL,
    nb_gynecologues                  TEXT NULL,
    nb_cancerologues                 TEXT NULL,
    nb_neurologues                   TEXT NULL,
    nb_ophtalmologues                TEXT NULL,
    nb_orl                           TEXT NULL,
    nb_cardiologues                  TEXT NULL,
    nb_pediatres                     TEXT NULL,
    nb_pneumologues                  TEXT NULL,
    nb_psychologues                  TEXT NULL,
    nb_radiologues                   TEXT NULL,
    nb_rhumatologues                 TEXT NULL,
    nb_sages_femmes                  TEXT NULL,

    -- Services à la population : Éducation
    nb_creches                       TEXT NULL,
    nb_ecoles_maternelles_publiques  TEXT NULL,
    nb_ecoles_maternelles_privees    TEXT NULL,
    nb_ecoles_primaires_publiques    TEXT NULL,
    nb_ecoles_primaires_privees      TEXT NULL,
    nb_colleges_publics              TEXT NULL,
    nb_colleges_prives               TEXT NULL,
    nb_lycees_publics                TEXT NULL,
    nb_lycees_prives                 TEXT NULL,

    -- Immobilier (page /immobilier.html)
    prix_m2_maison              TEXT    NULL,
    prix_m2_appartement         TEXT    NULL,
    evolution_prix_historique   TEXT    NULL,
    part_residences_principales TEXT    NULL,
    part_residences_secondaires TEXT    NULL,
    part_baux_meubles           TEXT    NULL,
    part_baux_non_meubles       TEXT    NULL,

    CONSTRAINT pk_homepedia_communes PRIMARY KEY (com, nccenr)
);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_nccenr
    ON homepedia.communes (nccenr);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_nb_habitant
    ON homepedia.communes (nb_habitant);

CREATE INDEX IF NOT EXISTS idx_homepedia_communes_note_moyenne_globale
    ON homepedia.communes (note_moyenne_globale);
