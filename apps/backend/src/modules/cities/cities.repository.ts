import { Injectable } from "@nestjs/common";
import { Document, Filter } from "mongodb";
import { buildMongoNumericExpression } from "../../common/mongo-numeric";
import { MongoService } from "../../db/mongo.service";
import { CitySortBy, GetCitiesQueryDto, SortOrder } from "./dto/get-cities-query.dto";

type PrimitiveMetric = string | number | null;

type CityDirectDocument = Document & {
  com: string;
  nom_commune: string;
  source?: string | null;
  code_dept?: string | null;
  code_postal?: PrimitiveMetric;
  nom_region?: string | null;
  nom_departement?: string | null;
  nom_metropole?: string | null;
  nom_maire?: string | null;
  city_page?: string | null;
  avis_page?: string | null;
  reviews_refs_count?: PrimitiveMetric;
  reviews_refs_last_collected_at?: Date | string | number | null;
  updated_at?: Date | string | number | null;
  note_moyenne_globale?: PrimitiveMetric;
  nb_avis?: PrimitiveMetric;
  prix_m2_maison?: PrimitiveMetric;
  prix_m2_appartement?: PrimitiveMetric;
  nb_habitant?: PrimitiveMetric;
  age_moyen?: PrimitiveMetric;
  pop_active?: PrimitiveMetric;
  score_securite?: PrimitiveMetric;
  score_environnement?: PrimitiveMetric;
  score_vie_pratique?: PrimitiveMetric;
  score_loisirs?: PrimitiveMetric;
  score_education?: PrimitiveMetric;
};

type CityRow = {
  com: string;
  nccenr: string;
  nb_habitant: PrimitiveMetric;
  age_moyen: PrimitiveMetric;
  pop_active: PrimitiveMetric;
  score_securite: PrimitiveMetric;
  score_environnement: PrimitiveMetric;
  score_vie_pratique: PrimitiveMetric;
  score_loisirs: PrimitiveMetric;
  score_sante: PrimitiveMetric;
  score_transports: PrimitiveMetric;
  score_education: PrimitiveMetric;
};

type OverviewRow = {
  total_cities: number;
  avg_population: number | null;
  avg_security: number | null;
  avg_environment: number | null;
};

type CommuneHarvestDocument = Document & {
  source?: string | null;
  links?: {
    city_page?: string;
    avis_page?: string;
  };
  admin_details?: Record<string, string | null | undefined>;
  demography?: Record<string, PrimitiveMetric>;
  security?: Record<string, PrimitiveMetric>;
  quality_of_life?: Record<string, PrimitiveMetric>;
  services?: Record<string, PrimitiveMetric>;
  real_estate?: Record<string, PrimitiveMetric>;
  reviews_refs?: {
    count?: number;
    last_collected_at?: Date | string | number | null;
  };
  updated_at?: Date | string | number | null;
};

type ReviewRawDocument = Document & {
  text?: string;
  sentiment_label?: string;
};

type CityDetailRow = {
  city: CityRow;
  admin: {
    codeDept: string | null;
    postalCode: string | null;
    region: string | null;
    departement: string | null;
    metropole: string | null;
    mayor: string | null;
  };
  source: {
    provider: string | null;
    cityPage: string | null;
    reviewsPage: string | null;
    harvestedAt: Date | string | number | null;
    updatedAt: Date | string | number | null;
  };
  blocks: {
    demography: Record<string, PrimitiveMetric>;
    security: Record<string, PrimitiveMetric>;
    qualityOfLife: Record<string, PrimitiveMetric>;
    services: Record<string, PrimitiveMetric>;
    realEstate: Record<string, PrimitiveMetric>;
  };
  reviews: {
    count: number;
    positive: string[];
    negative: string[];
    all: string[];
  };
};

const CITY_DIRECT_PROJECTION = {
  _id: 0,
  com: 1,
  nom_commune: 1,
  nb_habitant: 1,
  age_moyen: 1,
  pop_active: 1,
  score_securite: 1,
  score_environnement: 1,
  score_vie_pratique: 1,
  score_loisirs: 1,
  score_education: 1
} as const;

const SORT_FIELDS: Record<CitySortBy, string | null> = {
  [CitySortBy.Name]: "nom_commune",
  [CitySortBy.Population]: "nb_habitant",
  [CitySortBy.Security]: "score_securite",
  [CitySortBy.Environment]: "score_environnement",
  [CitySortBy.Health]: null,
  [CitySortBy.Transport]: null,
  [CitySortBy.Education]: "score_education"
};

@Injectable()
export class CitiesRepository {
  constructor(private readonly mongoService: MongoService) {}

  async findAll(query: GetCitiesQueryDto): Promise<CityRow[]> {
    const collection = await this.getCollection();
    const match = this.buildMatch(query);
    const offset = (query.page - 1) * query.limit;
    const sortField = SORT_FIELDS[query.sortBy];
    const sortDirection = query.order === SortOrder.Desc ? -1 : 1;

    if (!sortField || sortField === "nom_commune") {
      const documents = await collection
        .find(match, { projection: CITY_DIRECT_PROJECTION })
        .sort({ nom_commune: sortDirection, com: 1 })
        .skip(offset)
        .limit(query.limit)
        .toArray();

      return documents.map((document) => this.toCityRow(document));
    }

    const documents = await collection
      .aggregate<CityDirectDocument>([
        { $match: match },
        { $addFields: { _sortMetric: this.toNumericExpression(sortField) } },
        {
          $addFields: {
            _sortMetricMissing: {
              $cond: [{ $eq: ["$_sortMetric", null] }, 1, 0]
            }
          }
        },
        {
          $sort: {
            _sortMetricMissing: 1,
            _sortMetric: sortDirection,
            nom_commune: 1,
            com: 1
          }
        },
        { $skip: offset },
        { $limit: query.limit },
        { $project: CITY_DIRECT_PROJECTION }
      ])
      .toArray();

    return documents.map((document) => this.toCityRow(document));
  }

  async countAll(query: GetCitiesQueryDto): Promise<number> {
    const collection = await this.getCollection();
    return collection.countDocuments(this.buildMatch(query));
  }

  async findByCode(code: string): Promise<CityRow | null> {
    const collection = await this.getDirectCollection();
    const document = await collection.findOne(
      { com: code },
      { projection: CITY_DIRECT_PROJECTION }
    );

    return document ? this.toCityRow(document) : null;
  }

  async findDetailByCode(code: string): Promise<CityDetailRow | null> {
    const directCollection = await this.getDirectCollection();
    const directDocument = await directCollection.findOne({ com: code });

    if (!directDocument) {
      return null;
    }

    const [harvestDocument, reviewDocuments] = await Promise.all([
      this.getHarvestCollection().then((collection) =>
        collection.findOne(
          { com: code },
          {
            projection: {
              _id: 0,
              source: 1,
              links: 1,
              admin_details: 1,
              demography: 1,
              security: 1,
              quality_of_life: 1,
              services: 1,
              real_estate: 1,
              reviews_refs: 1,
              updated_at: 1
            }
          }
        )
      ),
      this.getReviewsCollection()
        .then((collection) =>
          collection
            .find(
              { com: code },
              {
                projection: {
                  _id: 0,
                  text: 1,
                  sentiment_label: 1
                }
              }
            )
            .limit(100)
            .toArray()
        )
    ]);

    const groupedReviews = this.groupReviews(reviewDocuments);
    return {
      city: this.toCityRow(directDocument),
      admin: {
        codeDept: directDocument.code_dept ?? null,
        postalCode: this.toNullableString(
          harvestDocument?.admin_details?.code_postal ?? directDocument.code_postal ?? null
        ),
        region: harvestDocument?.admin_details?.nom_region ?? directDocument.nom_region ?? null,
        departement:
          harvestDocument?.admin_details?.nom_departement ?? directDocument.nom_departement ?? null,
        metropole:
          harvestDocument?.admin_details?.nom_metropole ?? directDocument.nom_metropole ?? null,
        mayor: harvestDocument?.admin_details?.nom_maire ?? directDocument.nom_maire ?? null
      },
      source: {
        provider: harvestDocument?.source ?? directDocument.source ?? null,
        cityPage: harvestDocument?.links?.city_page ?? directDocument.city_page ?? null,
        reviewsPage: harvestDocument?.links?.avis_page ?? directDocument.avis_page ?? null,
        harvestedAt:
          harvestDocument?.reviews_refs?.last_collected_at ??
          directDocument.reviews_refs_last_collected_at ??
          null,
        updatedAt: harvestDocument?.updated_at ?? directDocument.updated_at ?? null
      },
      blocks: {
        demography: harvestDocument?.demography ?? {},
        security: harvestDocument?.security ?? {},
        qualityOfLife: harvestDocument?.quality_of_life ?? {},
        services: harvestDocument?.services ?? {},
        realEstate: harvestDocument?.real_estate ?? {}
      },
      reviews: {
        count:
          harvestDocument?.reviews_refs?.count ??
          this.parseIntegerValue(directDocument.reviews_refs_count) ??
          groupedReviews.all.length,
        positive: groupedReviews.positive,
        negative: groupedReviews.negative,
        all: groupedReviews.all
      }
    };
  }

  async getOverviewMetrics(): Promise<OverviewRow> {
    const collection = await this.getCollection();
    const [result] = await collection
      .aggregate<OverviewRow>([
        {
          $project: {
            population_numeric: this.toNumericExpression("nb_habitant"),
            security_numeric: this.toNumericExpression("score_securite"),
            environment_numeric: this.toNumericExpression("score_environnement")
          }
        },
        {
          $group: {
            _id: null,
            total_cities: { $sum: 1 },
            avg_population: { $avg: "$population_numeric" },
            avg_security: { $avg: "$security_numeric" },
            avg_environment: { $avg: "$environment_numeric" }
          }
        },
        {
          $project: {
            _id: 0,
            total_cities: 1,
            avg_population: 1,
            avg_security: 1,
            avg_environment: 1
          }
        }
      ])
      .toArray();

    return (
      result ?? {
        total_cities: 0,
        avg_population: null,
        avg_security: null,
        avg_environment: null
      }
    );
  }

  async findTopCitiesByScore(
    column: "score_securite" | "score_environnement",
    limit: number
  ): Promise<CityRow[]> {
    const collection = await this.getCollection();
    const documents = await collection
      .aggregate<CityDirectDocument>([
        { $addFields: { _sortMetric: this.toNumericExpression(column) } },
        { $match: { _sortMetric: { $ne: null } } },
        { $sort: { _sortMetric: -1, nom_commune: 1, com: 1 } },
        { $limit: limit },
        { $project: CITY_DIRECT_PROJECTION }
      ])
      .toArray();

    return documents.map((document) => this.toCityRow(document));
  }

  private async getCollection() {
    return this.getDirectCollection();
  }

  private async getDirectCollection() {
    return this.mongoService.getCollection<CityDirectDocument>("communes_direct");
  }

  private async getHarvestCollection() {
    return this.mongoService.getCollection<CommuneHarvestDocument>("communes_harvest");
  }

  private async getReviewsCollection() {
    return this.mongoService.getCollection<ReviewRawDocument>("reviews_raw");
  }

  private buildMatch(query: GetCitiesQueryDto): Filter<CityDirectDocument> {
    const filters: Document[] = [];

    if (query.search) {
      const normalizedSearch = query.search.trim();
      if (normalizedSearch) {
        const searchRegex = new RegExp(this.escapeRegex(normalizedSearch), "i");
        filters.push({
          $or: [{ com: searchRegex }, { nom_commune: searchRegex }]
        });
      }
    }

    if (query.code_dept) {
      filters.push({ code_dept: query.code_dept });
    }

    if (query.nom_region) {
      filters.push({
        nom_region: new RegExp(`^${this.escapeRegex(query.nom_region)}$`, "i")
      });
    }

    if (query.note_moyenne_globale_min !== undefined) {
      filters.push(
        this.buildNumericThresholdFilter(
          "note_moyenne_globale",
          "$gte",
          query.note_moyenne_globale_min
        )
      );
    }

    if (query.nb_avis_min !== undefined) {
      filters.push(
        this.buildNumericThresholdFilter("nb_avis", "$gte", query.nb_avis_min)
      );
    }

    if (query.prix_m2_maison_max !== undefined) {
      filters.push(
        this.buildNumericThresholdFilter(
          "prix_m2_maison",
          "$lte",
          query.prix_m2_maison_max
        )
      );
    }

    if (query.prix_m2_appartement_max !== undefined) {
      filters.push(
        this.buildNumericThresholdFilter(
          "prix_m2_appartement",
          "$lte",
          query.prix_m2_appartement_max
        )
      );
    }

    if (filters.length === 0) {
      return {};
    }

    if (filters.length === 1) {
      return filters[0] as Filter<CityDirectDocument>;
    }

    return { $and: filters } as Filter<CityDirectDocument>;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private buildNumericThresholdFilter(
    field: string,
    operator: "$gte" | "$lte",
    value: number
  ): Document {
    return {
      $expr: {
        $let: {
          vars: {
            numericValue: this.toNumericExpression(field)
          },
          in: {
            $and: [
              { $ne: ["$$numericValue", null] },
              { [operator]: ["$$numericValue", value] }
            ]
          }
        }
      }
    };
  }

  private toCityRow(document: CityDirectDocument): CityRow {
    return {
      com: document.com,
      nccenr: document.nom_commune,
      nb_habitant: document.nb_habitant ?? null,
      age_moyen: document.age_moyen ?? null,
      pop_active: document.pop_active ?? null,
      score_securite: document.score_securite ?? null,
      score_environnement: document.score_environnement ?? null,
      score_vie_pratique: document.score_vie_pratique ?? null,
      score_loisirs: document.score_loisirs ?? null,
      score_sante: null,
      score_transports: null,
      score_education: document.score_education ?? null
    };
  }

  private groupReviews(reviews: ReviewRawDocument[]) {
    const positive: string[] = [];
    const negative: string[] = [];
    const all: string[] = [];

    for (const review of reviews) {
      const text = review.text?.trim();
      if (!text) {
        continue;
      }

      if (!all.includes(text)) {
        all.push(text);
      }

      if (review.sentiment_label === "positive" && !positive.includes(text)) {
        positive.push(text);
      }

      if (review.sentiment_label === "negative" && !negative.includes(text)) {
        negative.push(text);
      }
    }

    return { positive, negative, all };
  }

  private parseIntegerValue(value: PrimitiveMetric | undefined): number | null {
    const numericValue = this.parseMetricValue(value ?? null);
    return numericValue === null ? null : Math.round(numericValue);
  }

  private toNullableString(value: PrimitiveMetric | string | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    return String(value);
  }

  private parseMetricValue(value: PrimitiveMetric): number | null {
    if (value === null) {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const normalized = value
      .replace(/,/g, ".")
      .replace(/\s+/g, "")
      .replace(/[^0-9.-]/g, "");

    if (!normalized || normalized === "." || normalized === "-" || normalized === "-.") {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumericExpression(field: string): Document {
    return buildMongoNumericExpression(field);
  }
}
