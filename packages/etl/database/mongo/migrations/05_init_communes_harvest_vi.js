// Migration 05 : collection communes_harvest_vi (document riche Ville-Idéale)
// Objectif :
// - 1 document "neste" par commune Ville-Idéale
// - structure compatible avec le pipeline Homepedia et les futurs enrichissements

const dbName = process.env.MONGO_DB || "homepedia_raw";
const dbTarget = db.getSiblingDB(dbName);

if (!dbTarget.getCollectionNames().includes("communes_harvest_vi")) {
  dbTarget.createCollection("communes_harvest_vi");
}

// Unicité par code INSEE commune.
dbTarget.communes_harvest_vi.createIndex(
  { com: 1 },
  { unique: true, name: "idx_communes_harvest_vi_com_unique" }
);

// Filtres fréquents source + mise à jour.
dbTarget.communes_harvest_vi.createIndex(
  { source: 1, updated_at: -1 },
  { name: "idx_communes_harvest_vi_source_updated_at" }
);

// Tri / requêtes analytiques sur volume d'avis.
dbTarget.communes_harvest_vi.createIndex(
  { nb_avis: -1 },
  { name: "idx_communes_harvest_vi_nb_avis" }
);

