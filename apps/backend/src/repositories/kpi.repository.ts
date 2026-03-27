import { Injectable, Optional } from "@nestjs/common";
import { Document } from "mongodb";
import { buildMongoNumericExpression } from "../common/mongo-numeric";
import { MongoService } from "../db/mongo.service";
import { Kpi } from "../models/kpi.model";
import { PostgresKpiRepository, PostgresKpiSnapshot } from "./kpi.postgres.repository";

type KpiSnapshot = {
  total_cities: number;
  reviewed_cities: number;
  avg_population: number | null;
  avg_security_score: number | null;
  avg_environment_score: number | null;
  avg_city_rating: number | null;
  avg_house_price_m2: number | null;
  avg_apartment_price_m2: number | null;
  captured_at: Date | string | number | null;
};

type KpiDefinition = {
  id: number;
  name: string;
  unit: string | null;
  source: string;
  selectValue: (snapshot: KpiSnapshot) => number | null;
  round?: boolean;
};

const KPI_DEFINITIONS: KpiDefinition[] = [
  {
    id: 1,
    name: "total_cities",
    unit: "cities",
    source: "mongo:communes_direct",
    selectValue: (snapshot) => snapshot.total_cities
  },
  {
    id: 2,
    name: "reviewed_cities",
    unit: "cities",
    source: "mongo:communes_direct",
    selectValue: (snapshot) => snapshot.reviewed_cities
  },
  {
    id: 3,
    name: "average_population",
    unit: "people",
    source: "mongo:communes_direct",
    selectValue: (snapshot) => snapshot.avg_population,
    round: true
  },
  {
    id: 4,
    name: "average_security_score",
    unit: "/5",
    source: "mongo:communes_direct",
    selectValue: (snapshot) => snapshot.avg_security_score,
    round: true
  },
  {
    id: 5,
    name: "average_environment_score",
    unit: "/5",
    source: "mongo:communes_direct",
    selectValue: (snapshot) => snapshot.avg_environment_score,
    round: true
  },
  {
    id: 6,
    name: "average_city_rating",
    unit: "/5",
    source: "mongo:communes_direct",
    selectValue: (snapshot) => snapshot.avg_city_rating,
    round: true
  },
  {
    id: 7,
    name: "average_house_price_m2",
    unit: "EUR/m2",
    source: "mongo:communes_direct",
    selectValue: (snapshot) => snapshot.avg_house_price_m2,
    round: true
  },
  {
    id: 8,
    name: "average_apartment_price_m2",
    unit: "EUR/m2",
    source: "mongo:communes_direct",
    selectValue: (snapshot) => snapshot.avg_apartment_price_m2,
    round: true
  }
];

@Injectable()
export class KpiRepository {
  constructor(
    private readonly mongoService: MongoService,
    @Optional() private readonly postgresRepository?: PostgresKpiRepository
  ) {}

  async findAll(): Promise<Kpi[]> {
    const [mongoSnapshot, postgresSnapshot] = await Promise.all([
      this.safeMongoSnapshot(),
      this.safePostgresSnapshot()
    ]);

    const hasMongoData = Boolean(mongoSnapshot && mongoSnapshot.total_cities > 0);
    const hasPostgresData = Boolean(postgresSnapshot && postgresSnapshot.total_cities > 0);

    if (!hasMongoData && !hasPostgresData) {
      return [];
    }

    const timestamp =
      this.toIsoString(postgresSnapshot?.captured_at ?? mongoSnapshot?.captured_at ?? null) ??
      new Date().toISOString();

    return KPI_DEFINITIONS.flatMap((definition) => {
      const rawValue =
        (hasPostgresData ? this.selectPostgresValue(definition.name, postgresSnapshot!) : null) ??
        (hasMongoData ? definition.selectValue(mongoSnapshot!) : null);

      if (rawValue === null) {
        return [];
      }

      const source =
        hasPostgresData && this.selectPostgresValue(definition.name, postgresSnapshot!) !== null
          ? this.resolvePostgresSource(definition.name)
          : definition.source;

      return [
        {
          id: definition.id,
          name: definition.name,
          value: definition.round ? this.round(rawValue) : rawValue,
          unit: definition.unit,
          source,
          capturedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ];
    });
  }

  async findById(id: number): Promise<Kpi | null> {
    const kpis = await this.findAll();
    return kpis.find((kpi) => kpi.id === id) ?? null;
  }

  private async computeMongoSnapshot(): Promise<KpiSnapshot | null> {
    const collection = await this.mongoService.getCollection<Document>("communes_direct");
    const [snapshot] = await collection
      .aggregate<KpiSnapshot>([
        {
          $project: {
            updated_at: 1,
            reviews_refs_count_numeric: this.toNumericExpression("reviews_refs_count"),
            population_numeric: this.toNumericExpression("nb_habitant"),
            security_numeric: this.toNumericExpression("score_securite"),
            environment_numeric: this.toNumericExpression("score_environnement"),
            city_rating_numeric: this.toNumericExpression("note_moyenne_globale"),
            house_price_numeric: this.toNumericExpression("prix_m2_maison"),
            apartment_price_numeric: this.toNumericExpression("prix_m2_appartement")
          }
        },
        {
          $group: {
            _id: null,
            total_cities: { $sum: 1 },
            reviewed_cities: {
              $sum: {
                $cond: [{ $gt: ["$reviews_refs_count_numeric", 0] }, 1, 0]
              }
            },
            avg_population: { $avg: "$population_numeric" },
            avg_security_score: { $avg: "$security_numeric" },
            avg_environment_score: { $avg: "$environment_numeric" },
            avg_city_rating: { $avg: "$city_rating_numeric" },
            avg_house_price_m2: { $avg: "$house_price_numeric" },
            avg_apartment_price_m2: { $avg: "$apartment_price_numeric" },
            captured_at: { $max: "$updated_at" }
          }
        },
        {
          $project: {
            _id: 0,
            total_cities: 1,
            reviewed_cities: 1,
            avg_population: 1,
            avg_security_score: 1,
            avg_environment_score: 1,
            avg_city_rating: 1,
            avg_house_price_m2: 1,
            avg_apartment_price_m2: 1,
            captured_at: 1
          }
        }
      ])
      .toArray();

    return snapshot ?? null;
  }

  private selectPostgresValue(
    name: string,
    snapshot: PostgresKpiSnapshot
  ): number | null {
    switch (name) {
      case "total_cities":
        return snapshot.total_cities;
      case "average_population":
        return snapshot.avg_population;
      case "average_security_score":
        return snapshot.avg_security_score;
      case "average_environment_score":
        return snapshot.avg_environment_score;
      case "average_house_price_m2":
        return snapshot.avg_house_price_m2;
      case "average_apartment_price_m2":
        return snapshot.avg_apartment_price_m2;
      default:
        return null;
    }
  }

  private resolvePostgresSource(name: string): string {
    switch (name) {
      case "total_cities":
      case "average_population":
      case "average_security_score":
      case "average_environment_score":
      case "average_house_price_m2":
      case "average_apartment_price_m2":
        return "postgres:v1";
      default:
        return "mongo:communes_direct";
    }
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toIsoString(value: Date | string | number | null): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === "number") {
      return new Date(value).toISOString();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private toNumericExpression(field: string): Document {
    return buildMongoNumericExpression(field);
  }

  private async safePostgresSnapshot(): Promise<PostgresKpiSnapshot | null> {
    try {
      return (await this.postgresRepository?.computeSnapshot()) ?? null;
    } catch {
      return null;
    }
  }

  private async safeMongoSnapshot(): Promise<KpiSnapshot | null> {
    try {
      return await this.computeMongoSnapshot();
    } catch {
      return null;
    }
  }
}
