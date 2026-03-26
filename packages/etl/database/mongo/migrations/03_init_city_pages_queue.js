// Migration 03 : collection city_pages_queue (queue d'ingestion via sitemap)
// Objectif : préparer la collection + index nécessaires à _init_queue_from_sitemap_if_empty()
// (le remplissage depuis le sitemap est géré côté script Python, quand la collection est vide).

const dbName = process.env.MONGO_DB || "homepedia_raw";
const db = db.getSiblingDB(dbName);

if (!db.getCollectionNames().includes("city_pages_queue")) {
  db.createCollection("city_pages_queue");
}

// Unicité par URL de page ville (évite les doublons si on relance le script).
db.city_pages_queue.createIndex({ url: 1 }, { unique: true, name: "idx_city_pages_queue_url_unique" });

// Chargement de la queue : { is_processed: False } + tri par url.
db.city_pages_queue.createIndex({ is_processed: 1, url: 1 }, { name: "idx_city_pages_queue_unprocessed_by_url" });

// Monitoring / reprise : retrouver rapidement les tentatives d'une commune.
db.city_pages_queue.createIndex({ com_id: 1, is_processed: 1 }, { name: "idx_city_pages_queue_by_com_and_status" });

// Aide au débogage : tri récent par updated_at (optionnel selon volume).
db.city_pages_queue.createIndex({ attempt_count: 1, updated_at: -1 }, { name: "idx_city_pages_queue_attempts_recent" });

