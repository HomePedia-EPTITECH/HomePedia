const TABLE_DEFINITIONS: Record<string, string> = {
  region: `
    CREATE TABLE region (
      numero_region INT PRIMARY KEY,
      name VARCHAR(40) NOT NULL
    );
  `,
  departement: `
    CREATE TABLE departement (
      id SERIAL PRIMARY KEY,
      numero_departement VARCHAR(10) NOT NULL UNIQUE,
      nom VARCHAR(40) NOT NULL,
      region_id INT NOT NULL REFERENCES region(numero_region)
    );
  `,
  metropole: `
    CREATE TABLE metropole (
      id SERIAL PRIMARY KEY,
      nom VARCHAR(40) NOT NULL
    );
  `,
  commune: `
    CREATE TABLE commune (
      id SERIAL PRIMARY KEY,
      com VARCHAR(10) NOT NULL UNIQUE,
      nom VARCHAR(50) NOT NULL,
      code_postal VARCHAR(10) NOT NULL,
      departement_id INT NOT NULL REFERENCES departement(id),
      metropole_id INT NULL REFERENCES metropole(id),
      maire VARCHAR(50) NULL
    );
  `,
  demographie: `
    CREATE TABLE demographie (
      id SERIAL PRIMARY KEY,
      commune_id INT NOT NULL UNIQUE REFERENCES commune(id),
      population INT,
      age_moyen INT,
      pop_active REAL,
      taux_chomage REAL,
      densite INT,
      revenu_moyen INT,
      superficie INT,
      part_0_14_ans REAL,
      part_15_29_ans REAL,
      part_30_44_ans REAL,
      part_45_59_ans REAL,
      part_60_74_ans REAL,
      part_75_89_ans REAL,
      part_90_plus REAL,
      part_cadres REAL,
      part_retraites REAL,
      part_employes REAL,
      part_ouvriers REAL,
      part_sans_diplome REAL,
      part_bac5_plus REAL,
      part_couple_avec_enfants REAL,
      part_personnes_seules REAL
    );
  `,
  scores: `
    CREATE TABLE scores (
      id SERIAL PRIMARY KEY,
      commune_id INT NOT NULL UNIQUE REFERENCES commune(id),
      score_securite REAL,
      score_education REAL,
      score_loisirs REAL,
      score_environnement REAL,
      score_vie_pratique REAL,
      score_globale REAL
    );
  `,
  securite: `
    CREATE TABLE securite (
      id SERIAL PRIMARY KEY,
      commune_id INT NOT NULL UNIQUE REFERENCES commune(id),
      agressions INT,
      cambriolages INT,
      vols_degradations INT,
      stupefiants INT
    );
  `,
  immobilier: `
    CREATE TABLE immobilier (
      id SERIAL PRIMARY KEY,
      commune_id INT NOT NULL UNIQUE REFERENCES commune(id),
      prix_m2_maison INT,
      prix_m2_appartement INT,
      part_taux_proprietaires REAL,
      part_taux_locataires REAL,
      part_residences_principales REAL,
      part_residences_secondaires REAL
    );
  `,
  education: `
    CREATE TABLE education (
      id SERIAL PRIMARY KEY,
      commune_id INT NOT NULL UNIQUE REFERENCES commune(id),
      nb_creches INT,
      nb_ecoles_maternelles_publiques INT,
      nb_ecoles_maternelles_privees INT,
      nb_ecoles_primaires_publiques INT,
      nb_ecoles_primaires_privees INT,
      nb_colleges_publics INT,
      nb_colleges_prives INT,
      nb_lycees_publics INT,
      nb_lycees_privees INT
    );
  `,
  sante: `
    CREATE TABLE sante (
      id SERIAL PRIMARY KEY,
      commune_id INT NOT NULL UNIQUE REFERENCES commune(id),
      nb_pharmacies INT,
      nb_hopitaux INT,
      nb_laboratoires_analyses INT,
      nb_etablissement_handicapes INT,
      nb_ehpa INT,
      nb_medecins INT,
      nb_dentistes INT,
      nb_chirurgiens INT,
      nb_dermatologues INT,
      nb_anesthesistes INT,
      nb_gastroenterologues INT,
      nb_gynecologues INT,
      nb_cancerologues INT,
      nb_neurologues INT,
      nb_ophtalmologues INT,
      nb_orl INT,
      nb_cardiologues INT,
      nb_pediatres INT,
      nb_pneumologues INT,
      nb_psychologues INT,
      nb_radiologues INT,
      nb_rhumatologues INT,
      nb_sages_femmes INT
    );
  `,
  commerces: `
    CREATE TABLE commerces (
      id SERIAL PRIMARY KEY,
      commune_id INT NOT NULL UNIQUE REFERENCES commune(id),
      nb_hypermarches INT,
      nb_supermarches INT,
      nb_superettes INT,
      nb_boulangeries INT,
      nb_boucheries INT,
      nb_restaurants INT,
      nb_garages INT,
      nb_stations_services INT,
      nb_banques INT,
      nb_bureaux_poste INT,
      nb_coiffeurs INT,
      nb_tabacs INT,
      nb_bars_discotheques INT,
      nb_bibliotheques INT,
      nb_cinema INT,
      nb_veterinaires INT
    );
  `
};

const TABLE_DEPENDENCIES: Record<string, string[]> = {
  region: [],
  departement: ["region"],
  metropole: [],
  commune: ["departement", "metropole"],
  demographie: ["commune"],
  scores: ["commune"],
  securite: ["commune"],
  immobilier: ["commune"],
  education: ["commune"],
  sante: ["commune"],
  commerces: ["commune"]
};

const TABLE_ORDER = Object.keys(TABLE_DEFINITIONS);

const BASE_DATA_SQL = `
  INSERT INTO region (numero_region, name) VALUES
    (11, 'Ile-de-France'),
    (53, 'Bretagne'),
    (84, 'Auvergne-Rhone-Alpes');

  INSERT INTO metropole (id, nom) VALUES
    (1, 'Metropole du Grand Paris'),
    (2, 'Metropole de Lyon');

  INSERT INTO departement (id, numero_departement, nom, region_id) VALUES
    (1, '75', 'Paris', 11),
    (2, '69', 'Rhone', 84),
    (3, '35', 'Ille-et-Vilaine', 53);

  INSERT INTO commune (id, com, nom, code_postal, departement_id, metropole_id, maire) VALUES
    (1, '75056', 'Paris', '75000', 1, 1, 'Anne Hidalgo'),
    (2, '75057', 'Paris Centre', '75001', 1, 1, 'Ariel Weil'),
    (3, '69123', 'Lyon', '69000', 2, 2, 'Gregory Doucet'),
    (4, '35238', 'Rennes', '35000', 3, NULL, 'Nathalie Appere');

  INSERT INTO demographie (
    commune_id, population, age_moyen, pop_active, taux_chomage, densite, revenu_moyen, superficie,
    part_0_14_ans, part_15_29_ans, part_30_44_ans, part_45_59_ans, part_60_74_ans, part_75_89_ans,
    part_90_plus, part_cadres, part_retraites, part_employes, part_ouvriers, part_sans_diplome,
    part_bac5_plus, part_couple_avec_enfants, part_personnes_seules
  ) VALUES
    (1, 2145906, 36, 65, 7.5, 20566, 43000, 105, 14, 21, 24, 18, 13, 8, 2, 28, 19, 14, 8, 12, 32, 18, 28),
    (2, 98000, 37, 63, 6.9, 21500, 41000, 18, 13, 20, 26, 18, 14, 7, 2, 25, 21, 15, 8, 11, 29, 17, 31),
    (3, 522228, 38, 64, 7.1, 10700, 32000, 48, 15, 22, 23, 17, 13, 8, 2, 21, 20, 16, 10, 13, 24, 19, 29),
    (4, 225081, 39, 62, 6.2, 4500, 30000, 50, 16, 24, 21, 16, 14, 7, 2, 20, 19, 16, 11, 10, 27, 20, 27);

  INSERT INTO scores (
    commune_id, score_securite, score_education, score_loisirs, score_environnement, score_vie_pratique, score_globale
  ) VALUES
    (1, 3.8, 4.0, 3.2, 4.1, 3.4, 3.9),
    (2, 4.1, 4.2, 3.5, 4.0, 3.6, 4.0),
    (3, 3.5, 3.9, 4.4, 4.3, 4.0, 4.1);

  INSERT INTO securite (commune_id, agressions, cambriolages, vols_degradations, stupefiants) VALUES
    (1, 120, 80, 210, 35),
    (3, 90, 70, 150, 22);

  INSERT INTO immobilier (
    commune_id, prix_m2_maison, prix_m2_appartement, part_taux_proprietaires, part_taux_locataires, part_residences_principales, part_residences_secondaires
  ) VALUES
    (1, 10450, 9850, 33.1, 61.4, 85.2, 6.7),
    (3, 6120, 5480, 36.2, 57.8, 88.1, 4.2);

  INSERT INTO education (
    commune_id, nb_creches, nb_ecoles_maternelles_publiques, nb_ecoles_maternelles_privees,
    nb_ecoles_primaires_publiques, nb_ecoles_primaires_privees, nb_colleges_publics, nb_colleges_prives,
    nb_lycees_publics, nb_lycees_privees
  ) VALUES
    (1, 320, 210, 35, 230, 40, 115, 28, 72, 19),
    (3, 140, 88, 14, 96, 12, 44, 8, 27, 7);

  INSERT INTO sante (
    commune_id, nb_pharmacies, nb_hopitaux, nb_laboratoires_analyses, nb_etablissement_handicapes, nb_ehpa,
    nb_medecins, nb_dentistes, nb_chirurgiens, nb_dermatologues, nb_anesthesistes, nb_gastroenterologues,
    nb_gynecologues, nb_cancerologues, nb_neurologues, nb_ophtalmologues, nb_orl, nb_cardiologues, nb_pediatres,
    nb_pneumologues, nb_psychologues, nb_radiologues, nb_rhumatologues, nb_sages_femmes
  ) VALUES
    (1, 428, 39, 74, 18, 26, 5100, 1850, 640, 120, 160, 88, 104, 46, 52, 140, 72, 95, 210, 41, 380, 67, 44, 315);

  INSERT INTO commerces (
    commune_id, nb_hypermarches, nb_supermarches, nb_superettes, nb_boulangeries, nb_boucheries, nb_restaurants,
    nb_garages, nb_stations_services, nb_banques, nb_bureaux_poste, nb_coiffeurs, nb_tabacs,
    nb_bars_discotheques, nb_bibliotheques, nb_cinema, nb_veterinaires
  ) VALUES
    (1, 8, 142, 210, 1290, 420, 14800, 310, 42, 280, 96, 2150, 380, 1700, 73, 27, 115),
    (3, 6, 96, 130, 480, 160, 5200, 220, 29, 120, 41, 840, 145, 650, 29, 14, 72);
`;

export function createPostgresV1Schema(
  tableNames: string[] = Object.keys(TABLE_DEFINITIONS)
): string {
  const resolved = new Set<string>();

  const visit = (tableName: string) => {
    const dependencies = TABLE_DEPENDENCIES[tableName];
    if (!dependencies) {
      throw new Error(`Unknown Postgres V1 test table: ${tableName}`);
    }

    for (const dependency of dependencies) {
      visit(dependency);
    }

    resolved.add(tableName);
  };

  for (const tableName of tableNames) {
    visit(tableName);
  }

  return TABLE_ORDER.filter((tableName) => resolved.has(tableName))
    .map((tableName) => TABLE_DEFINITIONS[tableName])
    .join("\n");
}

export function createPostgresV1Seed(): string {
  return BASE_DATA_SQL;
}
