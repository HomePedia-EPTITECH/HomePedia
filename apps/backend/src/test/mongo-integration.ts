import { Db, Document, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoService } from "../db/mongo.service";

export type MongoSeedCollections = Record<string, Document[]>;

export type MongoIntegrationHarness = {
  db: Db;
  mongoService: MongoService;
  replaceCollections: (collections: MongoSeedCollections) => Promise<void>;
  close: () => Promise<void>;
};

export async function createMongoIntegrationHarness(
  dbName = "homepedia_integration_tests"
): Promise<MongoIntegrationHarness> {
  const mongoServer = await MongoMemoryServer.create({
    binary: {
      version: "7.0.14"
    }
  });
  const client = new MongoClient(mongoServer.getUri());
  await client.connect();

  const db = client.db(dbName);
  const mongoService = {
    getCollection: async <T extends Document = Document>(name: string) => db.collection<T>(name)
  } as MongoService;

  return {
    db,
    mongoService,
    replaceCollections: async (collections: MongoSeedCollections) => {
      const existingCollections = await db.collections();
      await Promise.all(existingCollections.map((collection) => collection.deleteMany({})));

      for (const [name, documents] of Object.entries(collections)) {
        if (documents.length === 0) {
          continue;
        }

        await db.collection(name).insertMany(documents);
      }
    },
    close: async () => {
      await db.dropDatabase();
      await client.close();
      await mongoServer.stop();
    }
  };
}
