# API contract cible for communes

This document defines the public backend contract exposed to the frontend.

## Goals

- Serve a complete commune list for backend ranking and map views.
- Serve a full commune detail payload for the city page.
- Keep geographic lookups lightweight and predictable.

## Route map

| Method | Route | Status | Purpose |
|---|---|---|---|
| `GET` | `/communes` | Primary | Full filtered commune list, no pagination |
| `POST` | `/communes/rank` | Primary | Filter, score, sort, and paginate communes |
| `GET` | `/communes/search` | Primary | Lightweight autocomplete/search |
| `GET` | `/communes/:id` | Primary | Full commune detail payload |
| `GET` | `/stats/national` | Primary | National averages for comparisons |
| `GET` | `/regions` | Primary | Region list |
| `GET` | `/regions/:code` | Primary | Single region payload |
| `GET` | `/regions/:code/departements` | Primary | Departments in a region |
| `GET` | `/departements` | Primary | Department list, optional `?region=` filter |
| `GET` | `/departements/:code` | Primary | Single department payload |
| `GET` | `/departements/:code/cities` | Primary | Cities in a department |

## File layout proposal

```text
src/modules/communes/
  communes.controller.ts
  communes.service.ts
  communes.repository.ts
  dto/
    communes-list-query.dto.ts
    commune-list-response.dto.ts
    commune-detail-response.dto.ts
    commune-search-response.dto.ts
    communes-rank-request.dto.ts
    communes-rank-response.dto.ts
    national-stats-response.dto.ts
src/modules/geo/
  dto/
    city-response.dto.ts
    departement-response.dto.ts
    get-cities-query.dto.ts
    region-response.dto.ts
```

## DTO contracts

### `POST /communes/rank`

This is the endpoint that moves scoring to the backend.

Rules:

- `filters` are hard constraints.
- `importance` matches the frontend importance model.
- `subFocus` matches the frontend per-criterion focus model.
- The backend applies filters first, then computes scores, then sorts, then paginates.

Return shape:

```ts
export class CommuneRankRequestDto {
  filters!: {
    regionIds?: string[];
    departementIds?: string[];
    tailles?: Array<"village" | "ville" | "metropole">;
  };

  importance!: {
    pouvoirAchat!: 0 | 1 | 2 | 3;
    securite!: number;
    qualiteVie!: number;
    ecoles!: number;
    sante!: number;
    emploi!: number;
    commerces!: number;
    transports!: number;
    cultureLoisirs!: number;
  };

  subFocus?: Partial<Record<
    "pouvoirAchat" | "securite" | "qualiteVie" | "ecoles" | "sante" | "emploi" | "commerces" | "transports" | "cultureLoisirs",
    string[]
  >>;

  page?: number;
  limit?: number;
}

export class CommuneRankItemDto {
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
}

export class CommuneRankResponseDto {
  data!: CommuneRankItemDto[];
  meta!: {
    page!: number;
    limit!: number;
    total!: number;
    totalPages!: number;
  };
}
```

Scoring behavior:

- `region`, `departement`, `taille` filter the candidate set.
- All remaining communes are scored with the same weighting model.
- The ranking uses a global normalization baseline, not a page-local one.
- Pagination happens only after sorting by the final score.
- The scoring model mirrors `apps/frontend/src/data/criteria.ts`.

### `GET /communes`

Return shape:

```ts
export class CommuneListItemDto {
  id!: string;
  nom!: string;
  codePostal!: string;
  departement!: string;
  region!: string;
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

- No `meta`.
- No pagination.
- No heavy collections like `avis`, `prixHistorique`, `ageDistribution`.
- This is the dataset used for ranking, filtering, map markers, and comparisons.

### `GET /communes/:id`

Return shape:

```ts
export class CommuneDetailDto extends CommuneListItemDto {
  avis!: Array<{
    auteur: string;
    note: number;
    sentiment: "positif" | "negatif";
    texte: string;
  }>;

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

- This route is the single source of truth for the city page.
- If some values are unavailable, return `null` or empty arrays, but keep the keys stable.

### `GET /communes/search`

Return shape:

```ts
export class CommuneSearchItemDto {
  id!: string;
  nom!: string;
  codePostal!: string;
  departement!: string;
  region!: string;
  taille!: "village" | "ville" | "metropole";
}

export class CommuneSearchResponseDto {
  data!: CommuneSearchItemDto[];
}
```

Query params:

```ts
q?: string
limit?: number // default 8, max 8
```

Search should match:

- commune name
- department name
- region name
- postal code

### `GET /stats/national`

Return shape:

```ts
export class NationalStatsDto {
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
}

export class NationalStatsResponseDto {
  data!: NationalStatsDto;
}
```

## Backend implementation notes

### `/communes`

Suggested sources:

- `commune`
- `demographie`
- `scores`
- `securite`
- `immobilier`
- `education`
- `sante`
- `commerces`
- `salaire`

Suggested repository behavior:

- Select one row per commune.
- Join optional satellite tables with left joins.
- Return all fields needed by the ranking pipeline.
- Keep `lon` and `lat` in the contract only if the data source really provides them.

If `lon` and `lat` do not exist in SQL yet, add them to the source pipeline or explicitly return
`null` and let the frontend keep its current geocoding fallback.

### `/communes/:id`

Suggested sources:

- same tables as `/communes`
- plus `reviews_raw` for `avis[]`
- plus price history source if available
- plus age distribution source if available

Suggested rule:

- This route should not reuse the compact list DTO.
- It should extend it and add heavy sections only here.

### `/communes/search`

Suggested query strategy:

- ILIKE on `nom`
- ILIKE on `departement`
- ILIKE on `region`
- prefix or substring on `codePostal`

### `/stats/national`

Suggested strategy:

- Use the same SQL source as the commune list.
- Compute national averages once.
- Keep the payload minimal and stable.

## Recommended priority order

1. Implement `/communes`.
2. Implement `/communes/:id`.
3. Implement `/communes/search`.
4. Implement `/stats/national`.
5. Implement the geo detail routes.

## NestJS blueprint

### Module layout

```text
src/modules/communes/
  communes.controller.ts
  communes.service.ts
  communes.repository.ts
  communes.mapper.ts
  dto/
    communes-list-query.dto.ts
    communes-list-response.dto.ts
    communes-rank-request.dto.ts
    communes-rank-response.dto.ts
    commune-detail-response.dto.ts
    commune-search-query.dto.ts
    commune-search-response.dto.ts
    national-stats-response.dto.ts
    region-response.dto.ts
    departement-response.dto.ts
```

### Shared type shape

The backend should keep two internal representations:

```ts
export type CommuneRecord = {
  id: string;
  nom: string;
  codePostal: string;
  departement: string;
  region: string;
  metropole: string | null;
  taille: "village" | "ville" | "metropole";
  lon: number | null;
  lat: number | null;

  population: number | null;
  densite: number | null;
  superficie: number | null;
  ageMoyen: number | null;
  revenuMoyen: number | null;
  tauxChomage: number | null;

  prixM2Maison: number | null;
  prixM2Appartement: number | null;
  partProprietaires: number | null;
  partLocataires: number | null;
  partResidencesPrincipales: number | null;
  partResidencesSecondaires: number | null;

  agressions: number | null;
  cambriolages: number | null;
  volsDegradations: number | null;
  stupefiants: number | null;

  notes: {
    environnement: number | null;
    transports: number | null;
    sante: number | null;
    securite: number | null;
    sportsLoisirs: number | null;
    culture: number | null;
    enseignement: number | null;
    commerces: number | null;
    qualiteVie: number | null;
  };

  noteGlobale: number | null;
  nbAvis: number | null;

  services: {
    sante: Record<string, number | null>;
    education: Record<string, number | null>;
    commerces: Record<string, number | null>;
  };

  salary: {
    cadre: number | null;
    profIntermediaire: number | null;
    employe: number | null;
    ouvrier: number | null;
    total: number | null;
  };
};

export type CommuneDetailRecord = CommuneRecord & {
  avis: Array<{
    auteur: string;
    note: number;
    sentiment: "positif" | "negatif";
    texte: string;
  }>;
  prixHistorique: Array<{
    annee: number;
    prixM2: number;
  }>;
  ageDistribution: Array<{
    tranche: string;
    part: number;
  }>;
};
```

### `GET /communes`

Controller:

```ts
@Get()
findAll(@Query() query: GetCommunesQueryDto): Promise<CommuneListResponseDto>
```

Query DTO:

```ts
export class GetCommunesQueryDto {
  regionIds?: string[];
  departementIds?: string[];
  tailles?: Array<"village" | "ville" | "metropole">;
  search?: string;
  page?: number;
  limit?: number;
}
```

Service:

```ts
findAll(query: GetCommunesQueryDto): Promise<CommuneListResponseDto>
```

Repository strategy:

- Join all satellite tables once.
- Apply only hard filters here.
- Keep response compact enough for the ranking UI.
- If you keep pagination, use it only for the raw commune catalog, not for ranked results.

### `POST /communes/rank`

Controller:

```ts
@Post("rank")
rank(@Body() body: RankCommunesRequestDto): Promise<CommuneRankResponseDto>
```

Request DTO:

```ts
export class RankCommunesRequestDto {
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

Response DTO:

```ts
export class CommuneRankItemDto {
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
}

export class CommuneRankResponseDto {
  data!: CommuneRankItemDto[];
  meta!: {
    page!: number;
    limit!: number;
    total!: number;
    totalPages!: number;
  };
}
```

Service:

```ts
rank(body: RankCommunesRequestDto): Promise<CommuneRankResponseDto>
```

Implementation steps:

- Fetch the candidate communes with hard filters only.
- Build a global normalization baseline from the full dataset or from a cached metrics table.
- Compute each weighted sub-score.
- Compute the final score.
- Sort descending by final score.
- Apply pagination after sorting.
- Mirror the frontend criteria engine exactly.

### `GET /communes/:id`

Controller:

```ts
@Get(":id")
findOne(@Param("id") id: string): Promise<CommuneDetailResponseDto>
```

Service:

```ts
findOne(id: string): Promise<CommuneDetailResponseDto>
```

Repository strategy:

- Fetch the same base commune record as `/communes`.
- Add heavy sections:
  - `avis`
  - `prixHistorique`
  - `ageDistribution`
- Keep the payload stable even when some collections are missing.

### `GET /communes/search`

Controller:

```ts
@Get("search")
search(@Query() query: CommuneSearchQueryDto): Promise<CommuneSearchResponseDto>
```

Query DTO:

```ts
export class CommuneSearchQueryDto {
  q!: string;
  limit?: number;
}
```

Repository strategy:

- Search by `nom`, `departement`, `region`, `codePostal`.
- Return only small result rows.
- No score, no heavy relations.

### `GET /stats/national`

Controller:

```ts
@Get("/stats/national")
getNationalStats(): Promise<NationalStatsResponseDto>
```

Service:

```ts
getNationalStats(): Promise<NationalStatsResponseDto>
```

Repository strategy:

- Reuse the commune base tables.
- Compute national averages with one aggregate query.
- Cache if the dataset is large.

### `GET /regions`

Controller:

```ts
@Get("/regions")
findRegions(): Promise<RegionsResponseDto>
```

Return shape:

```ts
export class RegionItemDto {
  id!: string;
  nom!: string;
}

export class RegionsResponseDto {
  data!: RegionItemDto[];
}
```

### `GET /regions/:code`

Controller:

```ts
@Get("/regions/:code")
findRegion(@Param("code") code: string): Promise<RegionResponseDto>
```

Return shape:

```ts
export class RegionResponseDto {
  data!: RegionItemDto | null;
}
```

### `GET /regions/:code/departements`

Controller:

```ts
@Get("/regions/:code/departements")
findRegionDepartements(@Param("code") code: string): Promise<DepartementsResponseDto>
```

Return shape:

```ts
export class DepartementItemDto {
  id!: string;
  nom!: string;
  regionId!: string;
}

export class DepartementsResponseDto {
  data!: DepartementItemDto[];
}
```

### `GET /departements`

Controller:

```ts
@Get("/departements")
findDepartements(@Query("region") region?: string): Promise<DepartementsResponseDto>
```

Query params:

```ts
region?: string
```

Return shape:

```ts
export class DepartementItemDto {
  id!: string;
  nom!: string;
  regionId!: string;
}

export class DepartementsResponseDto {
  data!: DepartementItemDto[];
}
```

### `GET /departements/:code`

Controller:

```ts
@Get("/departements/:code")
findDepartement(@Param("code") code: string): Promise<DepartementResponseDto>
```

Return shape:

```ts
export class DepartementResponseDto {
  data!: DepartementItemDto | null;
}
```

### `GET /departements/:code/cities`

Controller:

```ts
@Get("/departements/:code/cities")
findDepartementCities(
  @Param("code") code: string,
  @Query() query: GetCitiesQueryDto
): Promise<CitiesResponseDto>
```

Return shape:

```ts
export class CityItemDto {
  code!: string;
  nom!: string;
  codePostal!: string;
}

export class CitiesResponseDto {
  data!: CityItemDto[];
}
```

## Implementable plan

### Phase 1 - Data contract

1. Create the new `communes` module and DTO files.
2. Define `CommuneRecord` and `CommuneDetailRecord`.
3. Add the `/communes/rank` request/response contract.
4. Keep the response shapes stable across all commune endpoints.

### Phase 2 - Repository

1. Build one SQL row mapper for `CommuneRecord`.
2. Add the joins for `demographie`, `scores`, `securite`, `immobilier`, `education`, `sante`, `commerces`, `salaire`.
3. Add the detail query for heavy fields.
4. Add the national aggregate query.
5. Add the search query.

### Phase 3 - Scoring

1. Move ranking logic into the service layer.
2. Define a normalization helper using global metrics.
3. Define weighted sub-score calculators.
4. Sort and paginate in the service.
5. Add tests for filtered ranking and deterministic score ordering.

### Phase 4 - Verification

1. Add integration tests for `/communes`, `/communes/:id`, `/communes/search`, `/stats/national`.
2. Add integration tests for `/regions`, `/regions/:code`, `/regions/:code/departements`, `/departements`, `/departements/:code`, `/departements/:code/cities`.
3. Add ranking tests with at least one synthetic filter scenario.
4. Verify pagination after sort, not before.
5. Keep `/communes` unpaginated and reserve pagination for `/communes/rank`.
