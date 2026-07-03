import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { GeoRegionsPostgresRepository } from "../geo/geo-regions.postgres.repository";
import { CommuneDetailResponseDto } from "./dto/commune-detail-response.dto";
import { CommuneListResponseDto } from "./dto/commune-list-response.dto";
import { CommuneSearchResponseDto } from "./dto/commune-search-response.dto";
import { CommuneRankRequestDto } from "./dto/communes-rank-request.dto";
import { CommuneRankResponseDto } from "./dto/communes-rank-response.dto";
import { NationalStatsResponseDto } from "./dto/national-stats-response.dto";
import { GetCommunesQueryDto } from "./dto/communes-list-query.dto";
import { CommuneRecord } from "./communes.types";
import { CommunesRepository } from "./communes.repository";
import {
  buildScoreRanges,
  personalScore,
  scoreBreakdown
} from "./communes.scoring";

@Injectable()
export class CommunesService {
  constructor(
    private readonly communesRepository: CommunesRepository,
    private readonly regionsRepository: GeoRegionsPostgresRepository
  ) {}

  async findAll(query: GetCommunesQueryDto = new GetCommunesQueryDto()): Promise<CommuneListResponseDto> {
    const catalogue = await this.loadCatalogue();
    const filtered = await this.applyListFilters(catalogue, query);

    return {
      data: filtered.map((commune) => this.toListItem(commune))
    };
  }

  async findOne(id: string): Promise<CommuneDetailResponseDto> {
    const commune = await this.safeLoadCommune(id);
    if (!commune) {
      throw new NotFoundException(`Commune ${id} not found`);
    }

    try {
      const [avis, prixHistorique, ageDistribution] = await Promise.all([
        this.communesRepository.findReviewsByCommuneCode(commune.id, 20),
        this.communesRepository.findPriceHistory(commune.id),
        this.communesRepository.findAgeDistribution(commune.id)
      ]);

      return {
        data: {
          ...this.toListItem(commune),
          avis,
          prixHistorique,
          ageDistribution
        }
      };
    } catch {
      throw new ServiceUnavailableException("Commune data source is unavailable");
    }
  }

  async search(q: string | undefined, limit = 8): Promise<CommuneSearchResponseDto> {
    const query = (q ?? "").trim().toLowerCase();
    if (!query) {
      return { data: [] };
    }

    const catalogue = await this.loadCatalogue();
    const matches = catalogue
      .map((commune) => ({
        commune,
        score: this.scoreSearchMatch(commune, query)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.commune.nom.localeCompare(b.commune.nom, "fr");
      })
      .slice(0, Math.max(1, Math.min(10, Math.trunc(limit))));

    return {
      data: matches.map(({ commune }) => this.toSearchItem(commune))
    };
  }

  async rank(request: CommuneRankRequestDto): Promise<CommuneRankResponseDto> {
    const catalogue = await this.loadCatalogue();
    const ranges = buildScoreRanges(catalogue);
    const hardFiltered = await this.applyRankFilters(catalogue, request.filters);

    const ranked: CommuneRankResponseDto["data"] = hardFiltered
      .map((commune) => {
        const focus = request.subFocus ?? {};
        const breakdown = scoreBreakdown(commune, ranges, focus);
        const score = personalScore(commune, request.importance, ranges, focus);

        return {
          commune: this.toListItem(commune),
          score,
          breakdown
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return a.commune.nom.localeCompare(b.commune.nom, "fr");
      });

    const page = request.page ?? 1;
    const limit = request.limit ?? 20;
    const total = ranked.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;

    return {
      data: ranked.slice(start, start + limit),
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  async getNationalStats(): Promise<NationalStatsResponseDto> {
    const catalogue = await this.loadCatalogue();

    return {
      data: {
        populationMoyenne: this.average(catalogue.map((item) => item.population)),
        revenuMoyen: this.average(catalogue.map((item) => item.revenuMoyen)),
        tauxChomageMoyen: this.average(catalogue.map((item) => item.tauxChomage)),
        prixM2MaisonMoyen: this.average(catalogue.map((item) => item.prixM2Maison)),
        prixM2AppartementMoyen: this.average(catalogue.map((item) => item.prixM2Appartement)),
        agressionsMoyen: this.average(catalogue.map((item) => item.agressions)),
        cambriolagesMoyen: this.average(catalogue.map((item) => item.cambriolages)),
        volsDegradationsMoyen: this.average(catalogue.map((item) => item.volsDegradations)),
        stupefiantsMoyen: this.average(catalogue.map((item) => item.stupefiants)),
        notesMoyennes: {
          environnement: this.average(catalogue.map((item) => item.notes.environnement)),
          transports: this.average(catalogue.map((item) => item.notes.transports)),
          sante: this.average(catalogue.map((item) => item.notes.sante)),
          securite: this.average(catalogue.map((item) => item.notes.securite)),
          sportsLoisirs: this.average(catalogue.map((item) => item.notes.sportsLoisirs)),
          culture: this.average(catalogue.map((item) => item.notes.culture)),
          enseignement: this.average(catalogue.map((item) => item.notes.enseignement)),
          commerces: this.average(catalogue.map((item) => item.notes.commerces)),
          qualiteVie: this.average(catalogue.map((item) => item.notes.qualiteVie))
        }
      }
    };
  }

  private async loadCatalogue(): Promise<CommuneRecord[]> {
    try {
      return await this.communesRepository.loadCatalogue();
    } catch {
      throw new ServiceUnavailableException("Commune data source is unavailable");
    }
  }

  private async safeLoadCommune(id: string): Promise<CommuneRecord | null> {
    try {
      return await this.communesRepository.findById(id);
    } catch {
      throw new ServiceUnavailableException("Commune data source is unavailable");
    }
  }

  private async applyListFilters(
    catalogue: CommuneRecord[],
    query: GetCommunesQueryDto
  ): Promise<CommuneRecord[]> {
    const departmentCodes = await this.resolveRegionDepartments(query.region);
    const departementFilter = new Set(
      (query.departement ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean)
    );
    const regionFilter = new Set(
      (query.region ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean)
    );
    const sizeFilter = new Set(query.taille ?? []);
    const search = (query.search ?? "").trim().toLowerCase();

    return catalogue.filter((commune) => {
      if (regionFilter.size > 0 && !this.matchesRegion(commune, regionFilter, departmentCodes)) {
        return false;
      }

      if (departementFilter.size > 0 && !this.matchesDepartement(commune, departementFilter)) {
        return false;
      }

      if (sizeFilter.size > 0 && !sizeFilter.has(commune.taille)) {
        return false;
      }

      if (query.prixMax !== undefined && this.referencePrice(commune) !== null) {
        const price = this.referencePrice(commune);
        if (price !== null && price > query.prixMax) {
          return false;
        }
      }

      if (search && !this.matchesSearch(commune, search)) {
        return false;
      }

      return true;
    });
  }

  private async applyRankFilters(
    catalogue: CommuneRecord[],
    filters: CommuneRankRequestDto["filters"]
  ): Promise<CommuneRecord[]> {
    const departmentCodes = await this.resolveRegionDepartments(filters.regionIds);
    const departementFilter = new Set(
      (filters.departementIds ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean)
    );
    const regionFilter = new Set(
      (filters.regionIds ?? []).map((value) => value.trim().toUpperCase()).filter(Boolean)
    );
    const sizeFilter = new Set(filters.tailles ?? []);

    return catalogue.filter((commune) => {
      if (regionFilter.size > 0 && !this.matchesRegion(commune, regionFilter, departmentCodes)) {
        return false;
      }

      if (departementFilter.size > 0 && !this.matchesDepartement(commune, departementFilter)) {
        return false;
      }

      if (sizeFilter.size > 0 && !sizeFilter.has(commune.taille)) {
        return false;
      }

      return true;
    });
  }

  private async resolveRegionDepartments(regionIds: string[] | undefined): Promise<Set<string>> {
    const result = new Set<string>();
    if (!regionIds || regionIds.length === 0) {
      return result;
    }

    for (const regionId of regionIds) {
      try {
        const rows = await this.regionsRepository.findDepartementsByRegionCode(regionId);
        for (const row of rows ?? []) {
          const code = this.normalizeCode(row.code);
          if (code) {
            result.add(code);
          }
        }
      } catch {
        throw new ServiceUnavailableException("Region data source is unavailable");
      }
    }

    return result;
  }

  private matchesRegion(
    commune: CommuneRecord,
    regionFilter: Set<string>,
    departmentCodes: Set<string>
  ): boolean {
    const codeDept = commune.codeDept?.trim().toUpperCase();
    const regionCode = commune.regionCode?.trim().toUpperCase();

    if (regionCode && regionFilter.has(regionCode)) {
      return true;
    }

    if (codeDept && departmentCodes.has(codeDept)) {
      return true;
    }

    return false;
  }

  private matchesDepartement(commune: CommuneRecord, departementFilter: Set<string>): boolean {
    const codeDept = commune.codeDept?.trim().toUpperCase();
    if (codeDept && departementFilter.has(codeDept)) {
      return true;
    }

    const label = commune.departement?.trim().toUpperCase();
    return Boolean(label && departementFilter.has(label));
  }

  private matchesSearch(commune: CommuneRecord, search: string): boolean {
    const values = [
      commune.nom,
      commune.departement,
      commune.region,
      commune.codePostal,
      commune.id,
      commune.codeDept
    ]
      .map((value) => value?.toLowerCase().trim())
      .filter(Boolean) as string[];

    return values.some((value) => value.includes(search));
  }

  private scoreSearchMatch(commune: CommuneRecord, search: string): number {
    const name = commune.nom.toLowerCase();
    const department = (commune.departement ?? "").toLowerCase();
    const region = (commune.region ?? "").toLowerCase();
    const codePostal = (commune.codePostal ?? "").toLowerCase();
    const code = commune.id.toLowerCase();

    if (code === search || codePostal === search) {
      return 100;
    }

    if (name === search) {
      return 95;
    }

    if (name.startsWith(search)) {
      return 85;
    }

    if (department === search || region === search) {
      return 75;
    }

    if (name.includes(search)) {
      return 60;
    }

    if (department.includes(search) || region.includes(search) || codePostal.includes(search)) {
      return 50;
    }

    return 0;
  }

  private toSearchItem(commune: CommuneRecord) {
    return {
      id: commune.id,
      nom: commune.nom,
      codePostal: commune.codePostal,
      departement: commune.departement,
      region: commune.region,
      taille: commune.taille
    };
  }

  private toListItem(commune: CommuneRecord) {
    return {
      id: commune.id,
      nom: commune.nom,
      codePostal: commune.codePostal,
      departement: commune.departement,
      region: commune.region,
      metropole: commune.metropole,
      taille: commune.taille,
      lon: commune.lon,
      lat: commune.lat,
      population: commune.population,
      densite: commune.densite,
      superficie: commune.superficie,
      ageMoyen: commune.ageMoyen,
      revenuMoyen: commune.revenuMoyen,
      tauxChomage: commune.tauxChomage,
      prixM2Maison: commune.prixM2Maison,
      prixM2Appartement: commune.prixM2Appartement,
      partProprietaires: commune.partProprietaires,
      partLocataires: commune.partLocataires,
      partResidencesPrincipales: commune.partResidencesPrincipales,
      partResidencesSecondaires: commune.partResidencesSecondaires,
      partResidencesVacantes: commune.partResidencesVacantes,
      agressions: commune.agressions,
      cambriolages: commune.cambriolages,
      volsDegradations: commune.volsDegradations,
      stupefiants: commune.stupefiants,
      notes: commune.notes,
      noteGlobale: commune.noteGlobale,
      nbAvis: commune.nbAvis,
      services: commune.services,
      salary: commune.salary
    };
  }

  private average(values: Array<number | null | undefined>): number | null {
    const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (filtered.length === 0) {
      return null;
    }

    const sum = filtered.reduce((acc, value) => acc + value, 0);
    return Math.round((sum / filtered.length) * 100) / 100;
  }

  private rangeOf(values: Array<number | null>): { min: number; max: number } | null {
    const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (filtered.length === 0) {
      return null;
    }

    return {
      min: Math.min(...filtered),
      max: Math.max(...filtered)
    };
  }

  private normalize(value: number | null, range: { min: number; max: number } | null): number {
    if (value === null) {
      return 0;
    }

    if (!range) {
      return 50;
    }

    if (range.max === range.min) {
      return 50;
    }

    return Math.round(((value - range.min) / (range.max - range.min)) * 100);
  }

  private invertedSecurityScore(commune: CommuneRecord): number | null {
    const values = [
      commune.agressions,
      commune.cambriolages,
      commune.volsDegradations,
      commune.stupefiants
    ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    if (values.length === 0) {
      return null;
    }

    return -(values.reduce((sum, value) => sum + value, 0) / values.length);
  }

  private serviceDensity(count: number | null, population: number | null): number | null {
    if (count === null || population === null || population <= 0) {
      return null;
    }

    return Math.round((count / population) * 1000 * 100) / 100;
  }

  private referencePrice(commune: CommuneRecord): number | null {
    const values = [commune.prixM2Appartement, commune.prixM2Maison].filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value)
    );

    if (values.length === 0) {
      return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private sumNumbers(values: Array<number | null>): number | null {
    const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (filtered.length === 0) {
      return null;
    }

    return filtered.reduce((sum, value) => sum + value, 0);
  }

  private normalizeCode(value: string): string {
    return value.trim().toUpperCase();
  }
}
