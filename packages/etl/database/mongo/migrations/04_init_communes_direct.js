// Migration 04 : collection communes_direct (table directe aplatie par commune)
// Objectif :
// - 1 document par commune avec les champs importants "aplatis" en colonnes
// - facilitera les filtres Streamlit / exports sans parcours de sous-objets

const dbName = process.env.MONGO_DB || "homepedia_raw";
const db = db.getSiblingDB(dbName);

if (!db.getCollectionNames().includes("communes_direct")) {
  db.createCollection("communes_direct");
}

// Unicité par commune.
db.communes_direct.createIndex(
  { com: 1 },
  { unique: true, name: "idx_communes_direct_com_unique" }
);

// Filtres par échelle départementale.
db.communes_direct.createIndex(
  { code_dept: 1 },
  { name: "idx_communes_direct_code_dept" }
);

// Tri / dashboards par indicateur qualité de vie (facultatif mais utile).
db.communes_direct.createIndex(
  { "note_moyenne_globale": -1, "nb_avis": -1 },
  { name: "idx_communes_direct_quality_order" }
);

