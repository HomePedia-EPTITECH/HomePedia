import type { CommuneRecord } from "./communes.types";

export type CriterionKey =
  | "pouvoirAchat"
  | "securite"
  | "qualiteVie"
  | "ecoles"
  | "sante"
  | "emploi"
  | "commerces"
  | "transports"
  | "cultureLoisirs";

export const CRITERION_KEYS: CriterionKey[] = [
  "pouvoirAchat",
  "securite",
  "qualiteVie",
  "ecoles",
  "sante",
  "emploi",
  "commerces",
  "transports",
  "cultureLoisirs"
];

export type ImportanceLevel = 0 | 1 | 2 | 3;

export const LEVEL_WEIGHT: Record<ImportanceLevel, number> = {
  0: 0,
  1: 25,
  2: 60,
  3: 100
};

export type Importance = Record<CriterionKey, ImportanceLevel>;
export type SubFocus = Partial<Record<CriterionKey, string[]>>;

type Range = {
  min: number;
  max: number;
};

export interface ScoreRanges {
  prixAppart: Range | null;
  prixMoyen: Range | null;
  revenu: Range | null;
  chomage: Range | null;
  agr: Range | null;
  camb: Range | null;
  vols: Range | null;
  stup: Range | null;
  maternelle: Range | null;
  primaire: Range | null;
  college: Range | null;
  lycee: Range | null;
  medecins: Range | null;
  specialistes: Range | null;
  hopitaux: Range | null;
  supermarches: Range | null;
  restaurants: Range | null;
  boulangeries: Range | null;
  banques: Range | null;
}

const NOTE_SCALE = 10;

function rangeOf(values: number[]): Range | null {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (!Number.isFinite(value)) {
      continue;
    }

    if (value < min) {
      min = value;
    }
    if (value > max) {
      max = value;
    }
  }

  if (min === Infinity || max === -Infinity) {
    return null;
  }

  return { min, max };
}

function norm(value: number | null, range: Range | null, invert = false): number {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  if (!range || range.max === range.min) {
    return 50;
  }

  const t = (value - range.min) / (range.max - range.min);
  return Math.round((invert ? 1 - t : t) * 100);
}

function perMille(count: number | null, pop: number | null): number | null {
  if (count === null || pop === null || !Number.isFinite(count) || !Number.isFinite(pop) || pop <= 0) {
    return null;
  }

  return count / (pop / 1000);
}

function noteScore(value: number | null): number {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value * NOTE_SCALE);
}

function average(values: Array<number | null>): number | null {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (filtered.length === 0) {
    return null;
  }

  const sum = filtered.reduce((acc, value) => acc + value, 0);
  return sum / filtered.length;
}

function scoreNonNull(value: number | null, range: Range | null, invert = false): number {
  return norm(value, range, invert);
}

export function buildScoreRanges(catalogue: CommuneRecord[]): ScoreRanges {
  return {
    prixAppart: rangeOf(catalogue.map((c) => c.prixM2Appartement).filter((v): v is number => typeof v === "number" && Number.isFinite(v))),
    prixMoyen: rangeOf(
      catalogue
        .map((c) => average([c.prixM2Appartement, c.prixM2Maison]))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    revenu: rangeOf(catalogue.map((c) => c.revenuMoyen).filter((v): v is number => typeof v === "number" && Number.isFinite(v))),
    chomage: rangeOf(catalogue.map((c) => c.tauxChomage).filter((v): v is number => typeof v === "number" && Number.isFinite(v))),
    agr: rangeOf(catalogue.map((c) => c.agressions).filter((v): v is number => typeof v === "number" && Number.isFinite(v))),
    camb: rangeOf(catalogue.map((c) => c.cambriolages).filter((v): v is number => typeof v === "number" && Number.isFinite(v))),
    vols: rangeOf(catalogue.map((c) => c.volsDegradations).filter((v): v is number => typeof v === "number" && Number.isFinite(v))),
    stup: rangeOf(catalogue.map((c) => c.stupefiants).filter((v): v is number => typeof v === "number" && Number.isFinite(v))),
    maternelle: rangeOf(
      catalogue
        .map((c) => perMille(c.services.ecolesMaternelles, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    primaire: rangeOf(
      catalogue
        .map((c) => perMille(c.services.ecolesPrimaires, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    college: rangeOf(
      catalogue
        .map((c) => perMille(c.services.colleges, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    lycee: rangeOf(
      catalogue
        .map((c) => perMille(c.services.lycees, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    medecins: rangeOf(
      catalogue
        .map((c) => perMille(c.services.medecins, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    specialistes: rangeOf(
      catalogue
        .map((c) => perMille(c.services.specialistes, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    hopitaux: rangeOf(
      catalogue
        .map((c) => perMille(c.services.hopitaux, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    supermarches: rangeOf(
      catalogue
        .map((c) => perMille((c.services.hypermarches ?? 0) + (c.services.supermarches ?? 0), c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    restaurants: rangeOf(
      catalogue
        .map((c) => perMille(c.services.restaurants, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    boulangeries: rangeOf(
      catalogue
        .map((c) => perMille(c.services.boulangeries, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    ),
    banques: rangeOf(
      catalogue
        .map((c) => perMille(c.services.banques, c.population))
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    )
  };
}

type CriterionDef = {
  subs: Array<{
    key: string;
    score: (commune: CommuneRecord, ranges: ScoreRanges) => number;
  }>;
};

const CRITERIA: Record<CriterionKey, CriterionDef> = {
  pouvoirAchat: {
    subs: [
      {
        key: "louer",
        score: (commune, ranges) => scoreNonNull(commune.prixM2Appartement, ranges.prixAppart, true)
      },
      {
        key: "acheter",
        score: (commune, ranges) =>
          scoreNonNull(average([commune.prixM2Appartement, commune.prixM2Maison]), ranges.prixMoyen, true)
      }
    ]
  },
  securite: {
    subs: [
      { key: "agressions", score: (commune, ranges) => scoreNonNull(commune.agressions, ranges.agr, true) },
      { key: "cambriolages", score: (commune, ranges) => scoreNonNull(commune.cambriolages, ranges.camb, true) },
      { key: "vols", score: (commune, ranges) => scoreNonNull(commune.volsDegradations, ranges.vols, true) },
      { key: "stupefiants", score: (commune, ranges) => scoreNonNull(commune.stupefiants, ranges.stup, true) }
    ]
  },
  qualiteVie: {
    subs: [
      { key: "environnement", score: (commune) => noteScore(commune.notes.environnement) },
      { key: "transports", score: (commune) => noteScore(commune.notes.transports) },
      { key: "culture", score: (commune) => noteScore(commune.notes.culture) },
      { key: "sportsLoisirs", score: (commune) => noteScore(commune.notes.sportsLoisirs) }
    ]
  },
  ecoles: {
    subs: [
      {
        key: "maternelle",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.ecolesMaternelles, commune.population), ranges.maternelle)
      },
      {
        key: "primaire",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.ecolesPrimaires, commune.population), ranges.primaire)
      },
      {
        key: "college",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.colleges, commune.population), ranges.college)
      },
      {
        key: "lycee",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.lycees, commune.population), ranges.lycee)
      }
    ]
  },
  sante: {
    subs: [
      {
        key: "medecins",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.medecins, commune.population), ranges.medecins)
      },
      {
        key: "specialistes",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.specialistes, commune.population), ranges.specialistes)
      },
      {
        key: "hopitaux",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.hopitaux, commune.population), ranges.hopitaux)
      }
    ]
  },
  emploi: {
    subs: [
      { key: "revenus", score: (commune, ranges) => scoreNonNull(commune.revenuMoyen, ranges.revenu) },
      { key: "emploi", score: (commune, ranges) => scoreNonNull(commune.tauxChomage, ranges.chomage, true) }
    ]
  },
  commerces: {
    subs: [
      {
        key: "supermarches",
        score: (commune, ranges) =>
          scoreNonNull(
            perMille((commune.services.hypermarches ?? 0) + (commune.services.supermarches ?? 0), commune.population),
            ranges.supermarches
          )
      },
      {
        key: "boulangeries",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.boulangeries, commune.population), ranges.boulangeries)
      },
      {
        key: "restaurants",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.restaurants, commune.population), ranges.restaurants)
      },
      {
        key: "banques",
        score: (commune, ranges) => scoreNonNull(perMille(commune.services.banques, commune.population), ranges.banques)
      }
    ]
  },
  transports: {
    subs: [{ key: "transports", score: (commune) => noteScore(commune.notes.transports) }]
  },
  cultureLoisirs: {
    subs: [
      { key: "culture", score: (commune) => noteScore(commune.notes.culture) },
      { key: "sportsLoisirs", score: (commune) => noteScore(commune.notes.sportsLoisirs) }
    ]
  }
};

export function criterionScore(
  commune: CommuneRecord,
  key: CriterionKey,
  ranges: ScoreRanges,
  focus: string[] = []
): number {
  const def = CRITERIA[key];
  const chosen = focus.length ? def.subs.filter((sub) => focus.includes(sub.key)) : def.subs;
  const subs = chosen.length ? chosen : def.subs;
  const sum = subs.reduce((acc, sub) => acc + sub.score(commune, ranges), 0);
  return Math.round(sum / subs.length);
}

export function personalScore(
  commune: CommuneRecord,
  importance: Importance,
  ranges: ScoreRanges,
  focus: SubFocus = {}
): number {
  let acc = 0;
  let wsum = 0;

  for (const key of CRITERION_KEYS) {
    const weight = LEVEL_WEIGHT[importance[key] ?? 0];
    if (!weight) {
      continue;
    }

    acc += weight * criterionScore(commune, key, ranges, focus[key] ?? []);
    wsum += weight;
  }

  return wsum ? Math.round(acc / wsum) : 0;
}

export function scoreBreakdown(
  commune: CommuneRecord,
  ranges: ScoreRanges,
  focus: SubFocus = {}
): Record<CriterionKey, number> {
  const out = {} as Record<CriterionKey, number>;

  for (const key of CRITERION_KEYS) {
    out[key] = criterionScore(commune, key, ranges, focus[key] ?? []);
  }

  return out;
}
