// Migration 01 : structure de base pour la collection utilisée par le script Python.
// Idempotent : peut être relancé sans effet de bord.

const dbName = process.env.MONGO_DB || "homepedia_raw";
const db = db.getSiblingDB(dbName);

// Crée la collection si elle n'existe pas déjà.
if (!db.getCollectionNames().includes("city_backups")) {
  db.createCollection("city_backups");
}

// Index principal sur le code commune.
db.city_backups.createIndex({ com: 1 }, { unique: true });

// Index utiles pour les explorations futures (facultatifs).
db.city_backups.createIndex({ "metrics.nb_habitant": 1 });
db.city_backups.createIndex({ "metrics.score_securite": 1 });
