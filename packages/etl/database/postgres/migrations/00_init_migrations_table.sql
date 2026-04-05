DROP SCHEMA IF EXISTS bdd CASCADE;
DROP SCHEMA IF EXISTS staging CASCADE;

CREATE SCHEMA IF NOT EXISTS bdd;
CREATE SCHEMA IF NOT EXISTS staging;


CREATE TABLE IF NOT EXISTS bdd.region (
    numero_region           INT             NOT NULL,
    nom                     VARCHAR(50)     NOT NULL,

    CONSTRAINT pk_region PRIMARY KEY (numero_region)
);

CREATE TABLE IF NOT EXISTS bdd.departement (
    numero_departement      INT             NOT NULL,
    nom                     VARCHAR(50)     NOT NULL,

    CONSTRAINT pk_departement PRIMARY KEY (numero_departement)
);

CREATE TABLE IF NOT EXISTS bdd.metropole (
    id                      SERIAL          NOT NULL,
    nom                     VARCHAR(50)     NOT NULL,

    CONSTRAINT pk_metropole PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS bdd.commune (
    commune_id                 INT              NOT NULL,
    nom                 VARCHAR(200)      NOT NULL,
    code_postal         INT                 NULL,
    departement_id      INT                 NULL,
    metropole_id        INT                 NULL,
    maire               VARCHAR(200)         NULL,

    CONSTRAINT pk_commune PRIMARY KEY (commune_id),
    CONSTRAINT fk_commune_departement FOREIGN KEY (departement_id) REFERENCES bdd.departement(numero_departement),
    CONSTRAINT fk_commune_metropole FOREIGN KEY (metropole_id) REFERENCES bdd.metropole(id)
);

CREATE TABLE IF NOT EXISTS bdd.education (
    commune_id                              INT   NOT NULL,
    nb_creches                              INT   NOT NULL,
    nb_ecoles_maternelles_publiques         INT   NOT NULL,
    nb_ecoles_maternelles_privees           INT   NOT NULL,
    nb_ecoles_primaires_publiques           INT   NOT NULL,
    nb_ecoles_primaires_privees             INT   NOT NULL,
    nb_colleges_publiques                   INT   NOT NULL,
    nb_colleges_privees                     INT   NOT NULL,
    nb_lycees_publiques                     INT   NOT NULL,
    nb_lycees_privees                       INT   NOT NULL,

    CONSTRAINT pk_education PRIMARY KEY (commune_id),
    CONSTRAINT fk_education_commune FOREIGN KEY (commune_id) REFERENCES bdd.commune(commune_id)
);

CREATE TABLE IF NOT EXISTS bdd.sante (
    commune_id                              INT   NOT NULL,
    nb_pharmacies                           INT   NOT NULL,
    nb_hopitaux                             INT   NOT NULL,
    nb_laboratoires_analyses                INT   NOT NULL,
    nb_etablissement_handicapes             INT   NOT NULL,
    nb_ehpa                                 INT   NOT NULL,
    nb_medecins                             INT   NOT NULL,
    nb_dentistes                            INT   NOT NULL,
    nb_chirurgiens                          INT   NOT NULL,
    nb_dermatologues                        INT   NOT NULL,
    nb_anesthesistes                        INT   NOT NULL,
    nb_gastroenterologues                   INT   NOT NULL,
    nb_gynecologues                         INT   NOT NULL,
    nb_cancerologues                        INT   NOT NULL,
    nb_neurologues                          INT   NOT NULL,
    nb_ophtalmologues                       INT   NOT NULL,
    nb_orl                                  INT   NOT NULL,
    nb_cardiologues                         INT   NOT NULL,
    nb_pediatres                            INT   NOT NULL,
    nb_pneumologues                         INT   NOT NULL,
    nb_psychologues                         INT   NOT NULL,
    nb_radiologues                          INT   NOT NULL,
    nb_rhumatologues                        INT   NOT NULL,
    nb_sages_femmes                         INT   NOT NULL,
    
    CONSTRAINT pk_sante PRIMARY KEY (commune_id),
    CONSTRAINT fk_sante_commune FOREIGN KEY (commune_id) REFERENCES bdd.commune(commune_id)
);

CREATE TABLE IF NOT EXISTS bdd.commerces (
    commune_id                              INT   NOT NULL,
    nb_hypermarches                         INT   NOT NULL,
    nb_supermarches                         INT   NOT NULL,
    nb_superettes                           INT   NOT NULL,
    nb_boulangeries                         INT   NOT NULL,
    nb_boucheries                           INT   NOT NULL,
    nb_restaurants                          INT   NOT NULL,
    nb_garages                              INT   NOT NULL,
    nb_stations_services                    INT   NOT NULL,
    nb_banques                              INT   NOT NULL,
    nb_bureaux_poste                        INT   NOT NULL,
    nb_coiffeurs                            INT   NOT NULL,
    nb_tabacs                               INT   NOT NULL,
    nb_bars_discotheques                    INT   NOT NULL,
    nb_bibliotheques                        INT   NOT NULL,
    nb_cinema                               INT   NOT NULL,
    nb_veterinaires                         INT   NOT NULL,
    
    CONSTRAINT pk_commerces PRIMARY KEY (commune_id),
    CONSTRAINT fk_commerces_commune FOREIGN KEY (commune_id) REFERENCES bdd.commune(commune_id)
);

CREATE TABLE IF NOT EXISTS bdd.demographie (
    commune_id                              INT   NOT NULL,
    population                              INT   NOT NULL,
    age_moyen                               INT   NOT NULL,
    pop_active                              INT   NOT NULL,
    taux_chomage                            INT   NOT NULL,
    densite                                 INT   NOT NULL,
    revenu_moyen                            INT   NOT NULL,
    superficie                              INT   NOT NULL,
    part_0_14_ans                           FLOAT   NOT NULL,
    part_15_29_ans                          FLOAT   NOT NULL,
    part_30_44_ans                          FLOAT   NOT NULL,
    part_45_59_ans                          FLOAT   NOT NULL,
    part_60_74_ans                          FLOAT   NOT NULL,
    part_75_89_ans                          FLOAT   NOT NULL,
    part_90_plus                            FLOAT   NOT NULL,
    part_cadres                             FLOAT   NOT NULL,
    part_retraites                          FLOAT   NOT NULL,
    part_employes                           FLOAT   NOT NULL,
    part_ouvriers                           FLOAT   NOT NULL,
    part_sans_diplome                       FLOAT   NOT NULL,
    part_bac5_plus                          FLOAT   NOT NULL,
    part_couple_avec_enfants                FLOAT   NOT NULL,
    part_personnes_seules                   FLOAT   NOT NULL,
    
    CONSTRAINT pk_demographie PRIMARY KEY (commune_id),
    CONSTRAINT fk_demographie_commune FOREIGN KEY (commune_id) REFERENCES bdd.commune(commune_id)
);

CREATE TABLE IF NOT EXISTS bdd.scores (
    commune_id                              INT     NOT NULL,
    score_securite                          FLOAT   NOT NULL,
    score_education                         FLOAT   NOT NULL,
    score_loisirs                           FLOAT   NOT NULL,
    score_environnement                     FLOAT   NOT NULL,
    score_vie_pratique                      FLOAT   NOT NULL,
    score_globale                           FLOAT   NOT NULL,
    
    CONSTRAINT pk_scores PRIMARY KEY (commune_id),
    CONSTRAINT fk_scores_commune FOREIGN KEY (commune_id) REFERENCES bdd.commune(commune_id)
);

CREATE TABLE IF NOT EXISTS bdd.securite (
    commune_id                              INT   NOT NULL,
    agressions                              INT   NOT NULL,
    cambriolages                            INT   NOT NULL,
    vols_degradations                       INT   NOT NULL,
    stupefiants                             INT   NOT NULL,
    
    CONSTRAINT pk_securite PRIMARY KEY (commune_id),
    CONSTRAINT fk_securite_commune FOREIGN KEY (commune_id) REFERENCES bdd.commune(commune_id)
);

CREATE TABLE IF NOT EXISTS bdd.immobilier (
    commune_id                              INT   NOT NULL,
    prix_m2_maison                          INT   NOT NULL,
    prix_m2_appartement                     INT   NOT NULL,
    part_taux_proprietaires                 INT   NOT NULL,
    part_taux_locataires                    INT   NOT NULL,
    part_residences_principales             INT   NOT NULL,
    part_residences_secondaires             INT   NOT NULL,
    
    CONSTRAINT pk_immobilier PRIMARY KEY (commune_id),
    CONSTRAINT fk_immobilier_commune FOREIGN KEY (commune_id) REFERENCES bdd.commune(commune_id)
);

-- ============================================================
-- Création du schema et des tables de staging
-- À exécuter UNE SEULE FOIS sur ta base PostgreSQL
-- ============================================================

CREATE SCHEMA IF NOT EXISTS staging;

-- Les tables staging ont la même structure que bdd.*
-- mais SANS contraintes FK (pour éviter les erreurs d'ordre d'insertion)

CREATE TABLE IF NOT EXISTS staging.region (
    numero_region   INT             NOT NULL,
    nom             VARCHAR(50)     NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.departement (
    numero_departement  INT             NOT NULL,
    nom                 VARCHAR(50)     NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.metropole (
    id      INT             NOT NULL,   -- INT et non SERIAL : géré côté Spark
    nom     VARCHAR(50)     NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.commune (
    commune_id             INT             NOT NULL,
    nom             VARCHAR(200)     NOT NULL,
    code_postal     INT                 NULL,
    departement_id  INT                 NULL,
    metropole_id    INT                 NULL,
    maire           VARCHAR(200)         NULL
);

CREATE TABLE IF NOT EXISTS staging.education (
    commune_id                          INT NOT NULL,
    nb_creches                          INT NOT NULL,
    nb_ecoles_maternelles_publiques     INT NOT NULL,
    nb_ecoles_maternelles_privees       INT NOT NULL,
    nb_ecoles_primaires_publiques       INT NOT NULL,
    nb_ecoles_primaires_privees         INT NOT NULL,
    nb_colleges_publiques               INT NOT NULL,
    nb_colleges_privees                 INT NOT NULL,
    nb_lycees_publiques                 INT NOT NULL,
    nb_lycees_privees                   INT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.sante (
    commune_id                      INT NOT NULL,
    nb_pharmacies                   INT NOT NULL,
    nb_hopitaux                     INT NOT NULL,
    nb_laboratoires_analyses        INT NOT NULL,
    nb_etablissement_handicapes     INT NOT NULL,
    nb_ehpa                         INT NOT NULL,
    nb_medecins                     INT NOT NULL,
    nb_dentistes                    INT NOT NULL,
    nb_chirurgiens                  INT NOT NULL,
    nb_dermatologues                INT NOT NULL,
    nb_anesthesistes                INT NOT NULL,
    nb_gastroenterologues           INT NOT NULL,
    nb_gynecologues                 INT NOT NULL,
    nb_cancerologues                INT NOT NULL,
    nb_neurologues                  INT NOT NULL,
    nb_ophtalmologues               INT NOT NULL,
    nb_orl                          INT NOT NULL,
    nb_cardiologues                 INT NOT NULL,
    nb_pediatres                    INT NOT NULL,
    nb_pneumologues                 INT NOT NULL,
    nb_psychologues                 INT NOT NULL,
    nb_radiologues                  INT NOT NULL,
    nb_rhumatologues                INT NOT NULL,
    nb_sages_femmes                 INT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.commerces (
    commune_id              INT NOT NULL,
    nb_hypermarches         INT NOT NULL,
    nb_supermarches         INT NOT NULL,
    nb_superettes           INT NOT NULL,
    nb_boulangeries         INT NOT NULL,
    nb_boucheries           INT NOT NULL,
    nb_restaurants          INT NOT NULL,
    nb_garages              INT NOT NULL,
    nb_stations_services    INT NOT NULL,
    nb_banques              INT NOT NULL,
    nb_bureaux_poste        INT NOT NULL,
    nb_coiffeurs            INT NOT NULL,
    nb_tabacs               INT NOT NULL,
    nb_bars_discotheques    INT NOT NULL,
    nb_bibliotheques        INT NOT NULL,
    nb_cinema               INT NOT NULL,
    nb_veterinaires         INT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.demographie (
    commune_id                  INT     NOT NULL,
    population                  INT     NOT NULL,
    age_moyen                   INT     NOT NULL,
    pop_active                  INT     NOT NULL,
    taux_chomage                INT     NOT NULL,
    densite                     INT     NOT NULL,
    revenu_moyen                INT     NOT NULL,
    superficie                  INT     NOT NULL,
    part_0_14_ans               FLOAT   NOT NULL,
    part_15_29_ans              FLOAT   NOT NULL,
    part_30_44_ans              FLOAT   NOT NULL,
    part_45_59_ans              FLOAT   NOT NULL,
    part_60_74_ans              FLOAT   NOT NULL,
    part_75_89_ans              FLOAT   NOT NULL,
    part_90_plus                FLOAT   NOT NULL,
    part_cadres                 FLOAT   NOT NULL,
    part_retraites              FLOAT   NOT NULL,
    part_employes               FLOAT   NOT NULL,
    part_ouvriers               FLOAT   NOT NULL,
    part_sans_diplome           FLOAT   NOT NULL,
    part_bac5_plus              FLOAT   NOT NULL,
    part_couple_avec_enfants    FLOAT   NOT NULL,
    part_personnes_seules       FLOAT   NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.scores (
    commune_id              INT     NOT NULL,
    score_securite          FLOAT   NOT NULL,
    score_education         FLOAT   NOT NULL,
    score_loisirs           FLOAT   NOT NULL,
    score_environnement     FLOAT   NOT NULL,
    score_vie_pratique      FLOAT   NOT NULL,
    score_globale           FLOAT   NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.securite (
    commune_id          INT NOT NULL,
    agressions          INT NOT NULL,
    cambriolages        INT NOT NULL,
    vols_degradations   INT NOT NULL,
    stupefiants         INT NOT NULL
);

CREATE TABLE IF NOT EXISTS staging.immobilier (
    commune_id                      INT NOT NULL,
    prix_m2_maison                  INT NOT NULL,
    prix_m2_appartement             INT NOT NULL,
    part_taux_proprietaires         INT NOT NULL,
    part_taux_locataires            INT NOT NULL,
    part_residences_principales     INT NOT NULL,
    part_residences_secondaires     INT NOT NULL
);