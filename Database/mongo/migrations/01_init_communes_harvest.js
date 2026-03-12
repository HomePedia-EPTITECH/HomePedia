// Migration 01 : collection communes_harvest (données brutes scrapées par commune)
// Contexte Homepedia : stockage des métriques et avis par commune.

const dbName = process.env.MONGO_DB || "homepedia_raw";
const db = db.getSiblingDB(dbName);

if (!db.getCollectionNames().includes("communes_harvest")) {
  db.createCollection("communes_harvest");
}

db.communes_harvest.createIndex({ com: 1 }, { unique: true });
db.communes_harvest.createIndex({ "metrics.nb_habitant": 1 });
db.communes_harvest.createIndex({ "metrics.score_securite": 1 });
db.communes_harvest.createIndex({ "real_estate.prix_m2_maison": 1 });
db.communes_harvest.createIndex({ "real_estate.prix_m2_appartement": 1 });
