import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Collection, Db, Document, MongoClient } from "mongodb";

@Injectable()
export class MongoService implements OnModuleDestroy {
  private readonly client: MongoClient;
  private readonly dbName: string;
  private database: Db | null = null;
  private isConnected = false;

  constructor() {
    this.dbName = process.env.MONGO_DB ?? "homepedia_raw";
    const mongoUri = process.env.MONGO_URI ?? this.buildMongoUri();
    this.client = new MongoClient(mongoUri);
  }

  async getCollection<T extends Document = Document>(name: string): Promise<Collection<T>> {
    if (!this.isConnected) {
      await this.client.connect();
      this.database = this.client.db(this.dbName);
      this.isConnected = true;
    }

    return this.database!.collection<T>(name);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      await this.client.close();
    }
  }

  private buildMongoUri(): string {
    const host = process.env.MONGO_HOST ?? "localhost";
    const port = process.env.MONGO_PORT ?? "27017";
    const user = process.env.MONGO_ROOT_USER ?? process.env.MONGO_USER ?? "";
    const password = process.env.MONGO_ROOT_PASSWORD ?? process.env.MONGO_PASSWORD ?? "";

    if (user && password) {
      return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/?authSource=admin`;
    }

    return `mongodb://${host}:${port}/`;
  }
}
