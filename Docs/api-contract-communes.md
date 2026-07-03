# API contract public HomePedia

This document describes the public backend contract consumed by the frontend.

## Source split

- Postgres serves all commune, geo, stats, and ranking data.
- Mongo serves reviews only.
- Commune routes must not embed review payloads anymore.

## Postgres routes

### `GET /communes`

Query params:

```ts
region?: string[];
departement?: string[];
taille?: Array<"village" | "ville" | "metropole">;
prixMax?: number;
```

Return shape:

```ts
export class CommuneListItemDto {
  id!: string;
  nom!: string;
  codePostal!: string | null;
  departement!: string | null;
  region!: string | null;
  metropole!: string | null;
  taille!: "village" | "ville" | "metropole";
  lon!: number | null;
  lat!: number | null;

  population!: number | null;
  densite!: number | null;
  superficie!: number | null;
  ageMoyen!: number | null;
  revenuMoyen!: number | null;
  tauxChomage!: number | null;

  prixM2Maison!: number | null;
  prixM2Appartement!: number | null;
  partProprietaires!: number | null;
  partLocataires!: number | null;
  partResidencesPrincipales!: number | null;
  partResidencesSecondaires!: number | null;
  partResidencesVacantes!: number | null;

  agressions!: number | null;
  cambriolages!: number | null;
  volsDegradations!: number | null;
  stupefiants!: number | null;

  notes!: {
    environnement!: number | null;
    transports!: number | null;
    sante!: number | null;
    securite!: number | null;
    sportsLoisirs!: number | null;
    culture!: number | null;
    enseignement!: number | null;
    commerces!: number | null;
    qualiteVie!: number | null;
  };

  noteGlobale!: number | null;
  nbAvis!: number | null;

  services!: {
    medecins!: number | null;
    pharmacies!: number | null;
    hopitaux!: number | null;
    specialistes!: number | null;
    creches!: number | null;
    ecolesMaternelles!: number | null;
    ecolesPrimaires!: number | null;
    colleges!: number | null;
    lycees!: number | null;
    hypermarches!: number | null;
    supermarches!: number | null;
    restaurants!: number | null;
    banques!: number | null;
    boulangeries!: number | null;
  };

  salary!: {
    cadre!: number | null;
    profIntermediaire!: number | null;
    employe!: number | null;
    ouvrier!: number | null;
    total!: number | null;
  };
}

export class CommuneListResponseDto {
  data!: CommuneListItemDto[];
}
```

Notes:

- No pagination.
- No `avis[]`.
- No `prixHistorique[]`.
- No `ageDistribution[]`.

### `GET /communes/:id`

Return shape:

```ts
export class CommuneDetailDto extends CommuneListItemDto {
  prixHistorique!: Array<{
    annee: number;
    prixM2: number;
  }>;

  ageDistribution!: Array<{
    tranche: string;
    part: number;
  }>;
}

export class CommuneDetailResponseDto {
  data!: CommuneDetailDto;
}
```

Notes:

- `avis[]` is not part of this route anymore.
- `prixHistorique[]` is currently empty until a Postgres history table is materialized.

### `GET /communes/search`

Query params:

```ts
q?: string;
limit?: number; // default 8, max 8
```

Return shape:

```ts
export class CommuneSearchItemDto {
  id!: string;
  nom!: string;
  codePostal!: string | null;
  departement!: string | null;
  region!: string | null;
  taille!: "village" | "ville" | "metropole";
}

export class CommuneSearchResponseDto {
  data!: CommuneSearchItemDto[];
}
```

### `POST /communes/rank`

Request body:

```ts
export class CommuneRankRequestDto {
  filters!: {
    regionIds?: string[];
    departementIds?: string[];
    tailles?: Array<"village" | "ville" | "metropole">;
  };

  importance!: {
    pouvoirAchat!: 0 | 1 | 2 | 3;
    securite!: 0 | 1 | 2 | 3;
    qualiteVie!: 0 | 1 | 2 | 3;
    ecoles!: 0 | 1 | 2 | 3;
    sante!: 0 | 1 | 2 | 3;
    emploi!: 0 | 1 | 2 | 3;
    commerces!: 0 | 1 | 2 | 3;
    transports!: 0 | 1 | 2 | 3;
    cultureLoisirs!: 0 | 1 | 2 | 3;
  };

  subFocus?: Partial<Record<
    "pouvoirAchat" | "securite" | "qualiteVie" | "ecoles" | "sante" | "emploi" | "commerces" | "transports" | "cultureLoisirs",
    string[]
  >>;

  page?: number;
  limit?: number;
}
```

Return shape:

```ts
export class CommuneRankResponseDto {
  data!: Array<{
    commune!: CommuneListItemDto;
    score!: number;
    breakdown!: {
      pouvoirAchat!: number;
      securite!: number;
      qualiteVie!: number;
      ecoles!: number;
      sante!: number;
      emploi!: number;
      commerces!: number;
      transports!: number;
      cultureLoisirs!: number;
    };
  }>;

  meta!: {
    page!: number;
    limit!: number;
    total!: number;
    totalPages!: number;
  };
}
```

### `GET /stats/national`

Return shape:

```ts
export class NationalStatsResponseDto {
  data!: {
    populationMoyenne!: number | null;
    revenuMoyen!: number | null;
    tauxChomageMoyen!: number | null;
    prixM2MaisonMoyen!: number | null;
    prixM2AppartementMoyen!: number | null;
    agressionsMoyen!: number | null;
    cambriolagesMoyen!: number | null;
    volsDegradationsMoyen!: number | null;
    stupefiantsMoyen!: number | null;
    notesMoyennes!: {
      environnement!: number | null;
      transports!: number | null;
      sante!: number | null;
      securite!: number | null;
      sportsLoisirs!: number | null;
      culture!: number | null;
      enseignement!: number | null;
      commerces!: number | null;
      qualiteVie!: number | null;
    };
  };
}
```

### Geo routes

The following routes are also Postgres-only:

- `GET /regions`
- `GET /regions/:code`
- `GET /regions/:code/departements`
- `GET /departements`
- `GET /departements/:code`
- `GET /departements/:code/cities`

`GET /departements` accepts `?region=` as an optional cascade filter.

## Mongo routes

### `GET /reviews/cities/:cityCode`

Return shape:

```ts
export class CityReviewsResponseDto {
  data!: {
    code!: string;
    sourceUrl!: string | null;
    harvestedAt!: string | null;
    reviews!: {
      positive!: string[];
      negative!: string[];
      all!: string[];
    };
  };
}
```

### `GET /reviews/cities/:cityCode/items`

Query params:

```ts
limit?: number; // default 100, max 100
cursor?: string;
```

Return shape:

```ts
export class CityReviewItemsResponseDto {
  cityCode!: string;
  sourceUrl!: string | null;
  harvestedAt!: string | null;
  reviews!: Array<{
    id!: string;
    text!: string;
    sentimentLabel!: string | null;
    source!: string | null;
    urlPage!: string | null;
    collectedAt!: string | null;
  }>;
  pagination!: {
    limit!: number;
    hasMore!: boolean;
    nextCursor!: string | null;
  };
}
```

## Rules

- `taille` is derived on the backend, not stored as a DB column.
- `communes` and `geo` routes must not embed Mongo reviews.
- The frontend must compose city details with one Postgres call and one reviews call.
- `MapSearch` stays Mapbox-only and does not need a backend route.
