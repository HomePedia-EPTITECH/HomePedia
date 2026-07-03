-- Migration 01 : salaires nets mensuels moyens par categorie socio-professionnelle (Insee BTS)

CREATE TABLE IF NOT EXISTS bdd.salaire (
    commune_id                                     INT     NOT NULL,
    salaire_net_mensuel_moyen_cadre                INT     NOT NULL,
    salaire_net_mensuel_moyen_prof_intermediaire   INT     NOT NULL,
    salaire_net_mensuel_moyen_employe              INT     NOT NULL,
    salaire_net_mensuel_moyen_ouvrier              INT     NOT NULL,
    salaire_net_mensuel_moyen_total                INT     NOT NULL,

    CONSTRAINT pk_salaire PRIMARY KEY (commune_id),
    CONSTRAINT fk_salaire_commune FOREIGN KEY (commune_id) REFERENCES bdd.commune(commune_id)
);

CREATE TABLE IF NOT EXISTS staging.salaire (
    commune_id                                     INT     NOT NULL,
    salaire_net_mensuel_moyen_cadre                INT     NOT NULL,
    salaire_net_mensuel_moyen_prof_intermediaire   INT     NOT NULL,
    salaire_net_mensuel_moyen_employe              INT     NOT NULL,
    salaire_net_mensuel_moyen_ouvrier              INT     NOT NULL,
    salaire_net_mensuel_moyen_total                INT     NOT NULL
);
