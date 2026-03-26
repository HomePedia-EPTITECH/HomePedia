// Exécuté au 1er démarrage (data dir vide) par l'image mongo officielle.
// Crée la DB et une collection de base pour éviter une DB "vide".

const dbName = process.env.MONGO_INITDB_DATABASE || "homepedia_raw";
db = db.getSiblingDB(dbName);

db.createCollection("communes_harvest");
