import { Injectable } from "@nestjs/common";
import { Document } from "mongodb";
import { MongoService } from "../../db/mongo.service";

type DepartementDocument = Document & {
  code_dept: string;
  nom_departement?: string | null;
  updated_at?: Date | string | number | null;
};

type DepartementRow = {
  code: string;
  name: string | null;
  cityCount: number;
  updatedAt: Date | string | number | null;
};

@Injectable()
export class DepartementsRepository {
  constructor(private readonly mongoService: MongoService) {}

  async findAll(): Promise<DepartementRow[]> {
    const collection = await this.mongoService.getCollection<DepartementDocument>("departements");
    return collection
      .aggregate<DepartementRow>(this.buildPipeline())
      .toArray();
  }

  async findByCode(code: string): Promise<DepartementRow | null> {
    const collection = await this.mongoService.getCollection<DepartementDocument>("departements");
    const [row] = await collection
      .aggregate<DepartementRow>(this.buildPipeline({ code_dept: code.toUpperCase() }))
      .toArray();
    return row ?? null;
  }

  private buildPipeline(match?: Document): Document[] {
    return [
      ...(match ? [{ $match: match }] : []),
      {
        $lookup: {
          from: "communes_direct",
          let: { codeDept: "$code_dept" },
          pipeline: [
            { $match: { $expr: { $eq: ["$code_dept", "$$codeDept"] } } },
            { $count: "count" }
          ],
          as: "cityStats"
        }
      },
      {
        $project: {
          _id: 0,
          code: "$code_dept",
          name: "$nom_departement",
          cityCount: {
            $ifNull: [{ $arrayElemAt: ["$cityStats.count", 0] }, 0]
          },
          updatedAt: "$updated_at"
        }
      },
      { $sort: { code: 1 } }
    ];
  }
}
