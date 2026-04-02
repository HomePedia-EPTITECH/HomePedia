// Migration 06 : collection communes_direct_vi (vue aplatie Spark-ready Ville-Idéale)
// Objectif :
// - stocker une table par commune (colonnes directes, non-nestées)
// - faciliter exports/lectures Spark sans transformation intermédiaire

const dbName = process.env.MONGO_DB || "homepedia_raw";
const dbTarget = db.getSiblingDB(dbName);

if (!dbTarget.getCollectionNames().includes("communes_direct_vi")) {
  dbTarget.createCollection("communes_direct_vi");
}

// Unicité par commune.
dbTarget.communes_direct_vi.createIndex(
  { com: 1 },
  { unique: true, name: "idx_communes_direct_vi_com_unique" }
);

// Filtrage courant.
dbTarget.communes_direct_vi.createIndex(
  { source: 1, updated_at: -1 },
  { name: "idx_communes_direct_vi_source_updated_at" }
);

// Index métriques principales pour dashboards / tri.
dbTarget.communes_direct_vi.createIndex(
  { note_qualite_vie_10: -1, nb_avis: -1 },
  { name: "idx_communes_direct_vi_quality_order" }
);

dbTarget.communes_direct_vi.createIndex(
  { note_securite_10: -1 },
  { name: "idx_communes_direct_vi_note_securite" }
);

