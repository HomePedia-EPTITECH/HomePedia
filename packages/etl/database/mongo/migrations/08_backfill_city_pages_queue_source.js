// Migration 08 : backfill robuste du champ source dans city_pages_queue
// Contexte :
// - des lignes historiques peuvent exister sans `source`
// - le scraper Ville-Idéale filtre/traite par source, donc il faut normaliser

const dbName = process.env.MONGO_DB || "homepedia_raw";
const dbTarget = db.getSiblingDB(dbName);

if (!dbTarget.getCollectionNames().includes("city_pages_queue")) {
  dbTarget.createCollection("city_pages_queue");
}

const now = new Date();

const sourceMissingOrEmpty = {
  $or: [
    { source: { $exists: false } },
    { source: null },
    { source: "" }
  ]
};

// 1) Lignes BDMV historiques (URL bien-dans-ma-ville)
const bdmvRes = dbTarget.city_pages_queue.updateMany(
  {
    ...sourceMissingOrEmpty,
    url: { $regex: /bien-dans-ma-ville\.fr/i }
  },
  {
    $set: {
      source: "bdmv",
      updated_at: now
    }
  }
);

// 2) Lignes Ville-Idéale historiques (URL ville-ideale)
const viRes = dbTarget.city_pages_queue.updateMany(
  {
    ...sourceMissingOrEmpty,
    url: { $regex: /ville-ideale\.fr/i }
  },
  {
    $set: {
      source: "ville_ideale",
      updated_at: now
    }
  }
);

const stats = {
  total: dbTarget.city_pages_queue.countDocuments({}),
  source_exists: dbTarget.city_pages_queue.countDocuments({ source: { $exists: true } }),
  source_missing: dbTarget.city_pages_queue.countDocuments({ source: { $exists: false } }),
  source_null: dbTarget.city_pages_queue.countDocuments({ source: null }),
  bdmv: dbTarget.city_pages_queue.countDocuments({ source: "bdmv" }),
  ville_ideale: dbTarget.city_pages_queue.countDocuments({ source: "ville_ideale" })
};

print(
  `[08_backfill_city_pages_queue_source] source=bdmv modifiés=${bdmvRes.modifiedCount}, source=ville_ideale modifiés=${viRes.modifiedCount}, stats=${JSON.stringify(stats)}`
);

