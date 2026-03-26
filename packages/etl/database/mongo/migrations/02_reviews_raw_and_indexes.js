// Migration 02 : collection reviews_raw dédiée à l'analyse textuelle / sentiment
// Objectifs :
// - Conserver le texte brut des avis (IA/NLP, word clouds, audit)
// - Garantir la jointure interne Mongo via le pivot INSEE "com"
// - Optimiser les filtres front et les batchs analytiques

const dbName = process.env.MONGO_DB || "homepedia_raw";
const dbTarget = db.getSiblingDB(dbName);

if (!dbTarget.getCollectionNames().includes("reviews_raw")) {
  dbTarget.createCollection("reviews_raw");
}

// Idempotence par source+commune+id externe (quand disponible)
dbTarget.reviews_raw.createIndex(
  { source: 1, com: 1, external_comment_id: 1 },
  {
    unique: true,
    partialFilterExpression: { external_comment_id: { $exists: true, $type: "string" } }
  }
);

// Lecture par commune (timeline locale)
dbTarget.reviews_raw.createIndex({ com: 1, collected_at: -1 });

// Filtres par source + commune
dbTarget.reviews_raw.createIndex({ source: 1, com: 1, collected_at: -1 });

// Requêtes IA (batch sentiment / nettoyage)
dbTarget.reviews_raw.createIndex({ sentiment_label: 1, collected_at: -1 });

// Recherche texte globale (optionnelle selon volume)
dbTarget.reviews_raw.createIndex(
  { text: "text" },
  { default_language: "french", name: "idx_reviews_text_fr" }
);

