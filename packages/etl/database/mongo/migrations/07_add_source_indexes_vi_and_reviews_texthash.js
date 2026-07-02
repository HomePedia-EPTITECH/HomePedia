// Migration 07 : compléments d'index pour multi-source
// - city_pages_queue : index source + status (nécessaire pour ville_ideale)
// - reviews_raw : dédup texte par hash (source + com + text_hash)

const dbName = process.env.MONGO_DB || "homepedia_raw";
const dbTarget = db.getSiblingDB(dbName);

if (!dbTarget.getCollectionNames().includes("city_pages_queue")) {
  dbTarget.createCollection("city_pages_queue");
}
if (!dbTarget.getCollectionNames().includes("reviews_raw")) {
  dbTarget.createCollection("reviews_raw");
}

dbTarget.city_pages_queue.createIndex(
  { source: 1, is_processed: 1, url: 1 },
  { name: "idx_city_pages_queue_by_source_status_url" }
);

dbTarget.city_pages_queue.createIndex(
  { source: 1, com_id: 1, is_processed: 1 },
  { name: "idx_city_pages_queue_by_source_com_status" }
);

dbTarget.reviews_raw.createIndex(
  { source: 1, com: 1, text_hash: 1 },
  {
    unique: true,
    name: "idx_reviews_raw_unique_text_hash",
    partialFilterExpression: { text_hash: { $exists: true, $type: "string" } }
  }
);

