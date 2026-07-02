// Migration 10 : salaires par categorie socio-professionnelle (Insee BTS)
// Objectif :
// - collection salaires_pcs_history pour stocker le detail com/pcs/sexe/millesime
// - index de deduplication et de consultation par commune
// - index de tri/filtre des indicateurs de salaire dans communes_direct

const dbName = process.env.MONGO_DB || "homepedia_raw";
const dbTarget = db.getSiblingDB(dbName);

if (!dbTarget.getCollectionNames().includes("salaires_pcs_history")) {
  dbTarget.createCollection("salaires_pcs_history");
}

dbTarget.salaires_pcs_history.createIndex(
  { com: 1, pcs_code: 1, sex: 1, time_period: 1 },
  { unique: true, name: "idx_salaires_pcs_history_com_pcs_sex_period_unique" }
);

dbTarget.salaires_pcs_history.createIndex(
  { source: 1, com: 1 },
  { name: "idx_salaires_pcs_history_source_com" }
);

if (!dbTarget.getCollectionNames().includes("communes_direct")) {
  dbTarget.createCollection("communes_direct");
}

dbTarget.communes_direct.createIndex(
  { salaire_net_mensuel_moyen_cadre: -1 },
  { name: "idx_communes_direct_salaire_cadre" }
);

dbTarget.communes_direct.createIndex(
  { salaire_net_mensuel_moyen_prof_intermediaire: -1 },
  { name: "idx_communes_direct_salaire_prof_intermediaire" }
);

dbTarget.communes_direct.createIndex(
  { salaire_net_mensuel_moyen_employe: -1 },
  { name: "idx_communes_direct_salaire_employe" }
);

dbTarget.communes_direct.createIndex(
  { salaire_net_mensuel_moyen_ouvrier: -1 },
  { name: "idx_communes_direct_salaire_ouvrier" }
);
