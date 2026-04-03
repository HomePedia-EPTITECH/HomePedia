// Migration 09 : historique DVF et index de perfs
// Objectif :
// - collection real_estate_history pour stocker les transactions DVF simplifiees
// - index de deduplication et de consultation par commune/date
// - index de tri/filtre des indicateurs DVF dans communes_direct

const dbName = process.env.MONGO_DB || "homepedia_raw";
const dbTarget = db.getSiblingDB(dbName);

if (!dbTarget.getCollectionNames().includes("real_estate_history")) {
  dbTarget.createCollection("real_estate_history");
}

dbTarget.real_estate_history.createIndex(
  { transaction_id: 1 },
  { unique: true, name: "idx_real_estate_history_transaction_id_unique" }
);

dbTarget.real_estate_history.createIndex(
  { com: 1, date_mutation: -1 },
  { name: "idx_real_estate_history_com_date_mutation" }
);

dbTarget.real_estate_history.createIndex(
  { source: 1, com: 1 },
  { name: "idx_real_estate_history_source_com" }
);

if (!dbTarget.getCollectionNames().includes("communes_direct")) {
  dbTarget.createCollection("communes_direct");
}

dbTarget.communes_direct.createIndex(
  { prix_m2_moyen_maison: -1 },
  { name: "idx_communes_direct_prix_m2_moyen_maison" }
);

dbTarget.communes_direct.createIndex(
  { prix_m2_moyen_appartement: -1 },
  { name: "idx_communes_direct_prix_m2_moyen_appartement" }
);

dbTarget.communes_direct.createIndex(
  { nb_ventes_totales: -1 },
  { name: "idx_communes_direct_nb_ventes_totales" }
);
