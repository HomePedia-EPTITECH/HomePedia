import { Injectable } from "@nestjs/common";
import { Document } from "mongodb";
import { MongoService } from "../../db/mongo.service";
import {
  CommuneAgeDistributionRecord,
  CommuneAvisRecord,
  CommuneDetailRecord,
  CommuneNotes,
  CommunePriceHistoryRecord,
  CommuneRecord,
  CommuneSalary,
  CommuneServices,
  CommuneSize
} from "./communes.types";

type RawCommuneDocument = Document & Record<string, unknown>;

@Injectable()
export class CommunesRepository {
  constructor(private readonly mongoService: MongoService) {}

  async loadCatalogue(): Promise<CommuneRecord[]> {
    const [directDocs, viDocs] = await Promise.all([
      this.findCollectionDocuments("communes_direct"),
      this.findCollectionDocuments("communes_direct_vi")
    ]);

    const byCode = new Map<string, CommuneRecord>();

    for (const doc of directDocs) {
      const record = this.mapDirectDocument(doc);
      byCode.set(record.id, record);
    }

    for (const doc of viDocs) {
      const code = this.asCode(doc.com);
      if (!code) {
        continue;
      }

      const viRecord = this.mapViDocument(doc);
      const current = byCode.get(code);
      if (current) {
        byCode.set(code, this.mergeCommuneRecord(current, viRecord));
      } else {
        byCode.set(code, viRecord);
      }
    }

    return Array.from(byCode.values()).sort((a, b) => {
      const byName = a.nom.localeCompare(b.nom, "fr");
      if (byName !== 0) {
        return byName;
      }

      return a.id.localeCompare(b.id);
    });
  }

  async findById(id: string): Promise<CommuneRecord | null> {
    const code = this.normalizeCode(id);
    if (!code) {
      return null;
    }

    const [directDoc, viDoc] = await Promise.all([
      this.findOneDocument("communes_direct", { com: code }),
      this.findOneDocument("communes_direct_vi", { com: code })
    ]);

    if (!directDoc && !viDoc) {
      return null;
    }

    const base = directDoc ? this.mapDirectDocument(directDoc) : this.mapViDocument(viDoc!);
    if (!viDoc) {
      return base;
    }

    return this.mergeCommuneRecord(base, this.mapViDocument(viDoc));
  }

  async findReviewsByCommuneCode(
    code: string,
    limit = 20
  ): Promise<CommuneAvisRecord[]> {
    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) {
      return [];
    }

    const collection = await this.mongoService.getCollection<RawCommuneDocument>("reviews_raw");
    const reviews = await collection
      .find(
        { com: normalizedCode },
        {
          projection: {
            _id: 0,
            text: 1,
            rating: 1,
            sentiment_label: 1,
            source: 1,
            url_page: 1,
            collected_at: 1
          }
        }
      )
      .sort({ collected_at: -1, _id: -1 })
      .limit(Math.max(1, Math.trunc(limit)))
      .toArray();

    return reviews.flatMap((review) => {
      const texte = this.asString(review.text);
      if (!texte) {
        return [];
      }

      const sentimentLabel = this.asString(review.sentiment_label)?.toLowerCase();
      const sentiment: "positif" | "negatif" =
        sentimentLabel === "negative" || sentimentLabel === "negatif" ? "negatif" : "positif";

      return [
        {
          auteur: this.asString(review.source) ?? "Anonyme",
          note: this.asNumber(review.rating),
          sentiment,
          texte
        }
      ];
    });
  }

  async findPriceHistory(code: string): Promise<CommunePriceHistoryRecord[]> {
    const normalizedCode = this.normalizeCode(code);
    if (!normalizedCode) {
      return [];
    }

    const collection = await this.mongoService.getCollection<RawCommuneDocument>("real_estate_history");
    const rows = await collection
      .aggregate<{ _id: number; prixM2: number }>([
        {
          $match: {
            com: normalizedCode,
            prix_m2: { $type: "number" }
          }
        },
        {
          $addFields: {
            year: {
              $convert: {
                input: { $substrBytes: [{ $ifNull: ["$date_mutation", ""] }, 0, 4] },
                to: "int",
                onError: null,
                onNull: null
              }
            }
          }
        },
        {
          $match: {
            year: { $ne: null }
          }
        },
        {
          $group: {
            _id: "$year",
            prixM2: { $avg: "$prix_m2" }
          }
        },
        {
          $sort: {
            _id: 1
          }
        }
      ])
      .toArray();

    return rows.map((row) => ({
      annee: row._id,
      prixM2: Math.round(row.prixM2 * 10) / 10
    }));
  }

  async findAgeDistribution(id: string): Promise<CommuneAgeDistributionRecord[]> {
    const code = this.normalizeCode(id);
    if (!code) {
      return [];
    }

    const [directDoc, viDoc] = await Promise.all([
      this.findOneDocument("communes_direct", { com: code }),
      this.findOneDocument("communes_direct_vi", { com: code })
    ]);

    const source = directDoc ?? viDoc;
    if (!source) {
      return [];
    }

    return this.buildAgeDistributionFromDocument(source);
  }

  private async findCollectionDocuments(name: string): Promise<RawCommuneDocument[]> {
    const collection = await this.mongoService.getCollection<RawCommuneDocument>(name);
    return collection.find({}, { projection: { _id: 0 } }).toArray();
  }

  private async findOneDocument(
    name: string,
    filter: Record<string, unknown>
  ): Promise<RawCommuneDocument | null> {
    const collection = await this.mongoService.getCollection<RawCommuneDocument>(name);
    return collection.findOne(filter, { projection: { _id: 0 } });
  }

  private mapDirectDocument(doc: RawCommuneDocument): CommuneRecord {
    const population = this.asNumber(
      this.pickNumber(doc, "population", "nb_habitant", "population_totale")
    );
    const salary = this.buildSalary(doc);
    const notes = this.buildNotes(doc);

    return {
      id: this.asCode(doc.com) ?? "",
      nom: this.asString(doc.nom_commune) ?? this.asString(doc.nom) ?? this.asString(doc.nccenr) ?? "",
      codePostal: this.asString(
        this.pickValue(doc, "code_postal", "postal_code", "codePostal")
      ),
      codeDept: this.asString(this.pickValue(doc, "code_dept", "departement_id")),
      regionCode: this.asString(this.pickValue(doc, "region_id", "numero_region")),
      departement:
        this.asString(this.pickValue(doc, "nom_departement", "departement_name")) ??
        this.asString(this.pickValue(doc, "departement")) ??
        this.asString(this.pickValue(doc, "code_dept", "departement_id")),
      region:
        this.asString(this.pickValue(doc, "nom_region", "region_name")) ??
        this.asString(this.pickValue(doc, "region")),
      metropole:
        this.asString(this.pickValue(doc, "nom_metropole", "metropole_name", "metropole")) ??
        null,
      taille: this.deriveSize(population, this.asString(doc.nom_metropole)),
      lon: this.asNumber(this.pickNumber(doc, "longitude", "lon")),
      lat: this.asNumber(this.pickNumber(doc, "latitude", "lat")),
      population,
      densite: this.asNumber(this.pickNumber(doc, "densite", "pop_densite")),
      superficie: this.asNumber(this.pickNumber(doc, "superficie")),
      ageMoyen: this.asNumber(this.pickNumber(doc, "age_moyen")),
      revenuMoyen: this.asNumber(this.pickNumber(doc, "revenu_moyen")),
      tauxChomage: this.asNumber(this.pickNumber(doc, "taux_chomage")),
      prixM2Maison: this.asNumber(
        this.pickNumber(doc, "prix_m2_maison", "prix_m2_moyen_maison")
      ),
      prixM2Appartement: this.asNumber(
        this.pickNumber(doc, "prix_m2_appartement", "prix_m2_moyen_appartement")
      ),
      partProprietaires: this.asNumber(
        this.pickNumber(doc, "part_taux_proprietaires", "part_proprietaires")
      ),
      partLocataires: this.asNumber(
        this.pickNumber(doc, "part_taux_locataires", "part_locataires")
      ),
      partResidencesPrincipales: this.asNumber(
        this.pickNumber(doc, "part_residences_principales")
      ),
      partResidencesSecondaires: this.asNumber(
        this.pickNumber(doc, "part_residences_secondaires")
      ),
      partResidencesVacantes: this.buildVacantResidences(doc),
      agressions: this.asNumber(this.pickNumber(doc, "agressions")),
      cambriolages: this.asNumber(this.pickNumber(doc, "cambriolages")),
      volsDegradations: this.asNumber(this.pickNumber(doc, "vols_degradations")),
      stupefiants: this.asNumber(this.pickNumber(doc, "stupefiants")),
      notes,
      noteGlobale:
        this.pickNumber(doc, "note_moyenne_globale") ??
        this.pickNumber(doc, "score_globale") ??
        this.scaleScore(this.pickNumber(doc, "note_qualite_vie_10"), 0.5),
      nbAvis: this.asNumber(this.pickNumber(doc, "nb_avis", "reviews_refs_count")),
      services: this.buildServices(doc),
      salary,
      source: this.asString(doc.source),
      cityPage: this.asString(this.pickValue(doc, "city_page", "avis_page", "links.city_page")),
      avisPage: this.asString(this.pickValue(doc, "avis_page", "links.avis_page")),
      updatedAt: this.asDateString(this.pickValue(doc, "updated_at", "updatedAt"))
    };
  }

  private mapViDocument(doc: RawCommuneDocument): CommuneRecord {
    const population = this.asNumber(this.pickNumber(doc, "population", "nb_habitant"));
    const baseSalary = this.buildSalary(doc);
    const notes = this.buildNotes(doc);

    return {
      id: this.asCode(doc.com) ?? "",
      nom: this.asString(doc.nom_commune) ?? "",
      codePostal: this.asString(this.pickValue(doc, "code_postal", "postal_code")),
      codeDept: this.asString(this.pickValue(doc, "code_dept", "departement_id")),
      regionCode: this.asString(this.pickValue(doc, "region_id", "numero_region")),
      departement:
        this.asString(this.pickValue(doc, "nom_departement", "departement_name")) ??
        this.asString(this.pickValue(doc, "departement")) ??
        this.asString(this.pickValue(doc, "code_dept", "departement_id")),
      region:
        this.asString(this.pickValue(doc, "nom_region", "region_name")) ??
        this.asString(this.pickValue(doc, "region")),
      metropole:
        this.asString(this.pickValue(doc, "nom_metropole", "metropole_name", "metropole")) ??
        null,
      taille: this.deriveSize(population, this.asString(doc.nom_metropole)),
      lon: this.asNumber(this.pickNumber(doc, "longitude", "lon")),
      lat: this.asNumber(this.pickNumber(doc, "latitude", "lat")),
      population,
      densite: this.asNumber(this.pickNumber(doc, "densite")),
      superficie: this.asNumber(this.pickNumber(doc, "superficie")),
      ageMoyen: this.asNumber(this.pickNumber(doc, "age_moyen")),
      revenuMoyen: this.asNumber(this.pickNumber(doc, "revenu_moyen")),
      tauxChomage: this.asNumber(this.pickNumber(doc, "taux_chomage")),
      prixM2Maison: this.asNumber(this.pickNumber(doc, "prix_m2_maison", "prix_m2_moyen_maison")),
      prixM2Appartement: this.asNumber(
        this.pickNumber(doc, "prix_m2_appartement", "prix_m2_moyen_appartement")
      ),
      partProprietaires: this.asNumber(this.pickNumber(doc, "part_taux_proprietaires")),
      partLocataires: this.asNumber(this.pickNumber(doc, "part_taux_locataires")),
      partResidencesPrincipales: this.asNumber(this.pickNumber(doc, "part_residences_principales")),
      partResidencesSecondaires: this.asNumber(this.pickNumber(doc, "part_residences_secondaires")),
      partResidencesVacantes: this.buildVacantResidences(doc),
      agressions: this.asNumber(this.pickNumber(doc, "agressions")),
      cambriolages: this.asNumber(this.pickNumber(doc, "cambriolages")),
      volsDegradations: this.asNumber(this.pickNumber(doc, "vols_degradations")),
      stupefiants: this.asNumber(this.pickNumber(doc, "stupefiants")),
      notes,
      noteGlobale:
        this.pickNumber(doc, "note_moyenne_globale") ??
        this.pickNumber(doc, "score_globale") ??
        this.scaleScore(this.pickNumber(doc, "note_qualite_vie_10"), 0.5),
      nbAvis: this.asNumber(this.pickNumber(doc, "nb_avis")),
      services: this.buildServices(doc),
      salary: baseSalary,
      source: this.asString(doc.source),
      cityPage: this.asString(this.pickValue(doc, "city_page", "links.city_page")),
      avisPage: this.asString(this.pickValue(doc, "avis_page", "links.avis_page")),
      updatedAt: this.asDateString(this.pickValue(doc, "updated_at", "updatedAt"))
    };
  }

  private mergeCommuneRecord(base: CommuneRecord, overlay: CommuneRecord): CommuneRecord {
    return {
      ...base,
      codePostal: overlay.codePostal ?? base.codePostal,
      codeDept: overlay.codeDept ?? base.codeDept,
      regionCode: overlay.regionCode ?? base.regionCode,
      departement: overlay.departement ?? base.departement,
      region: overlay.region ?? base.region,
      metropole: overlay.metropole ?? base.metropole,
      taille: overlay.taille ?? base.taille,
      lon: overlay.lon ?? base.lon,
      lat: overlay.lat ?? base.lat,
      population: overlay.population ?? base.population,
      densite: overlay.densite ?? base.densite,
      superficie: overlay.superficie ?? base.superficie,
      ageMoyen: overlay.ageMoyen ?? base.ageMoyen,
      revenuMoyen: overlay.revenuMoyen ?? base.revenuMoyen,
      tauxChomage: overlay.tauxChomage ?? base.tauxChomage,
      prixM2Maison: overlay.prixM2Maison ?? base.prixM2Maison,
      prixM2Appartement: overlay.prixM2Appartement ?? base.prixM2Appartement,
      partProprietaires: overlay.partProprietaires ?? base.partProprietaires,
      partLocataires: overlay.partLocataires ?? base.partLocataires,
      partResidencesPrincipales:
        overlay.partResidencesPrincipales ?? base.partResidencesPrincipales,
      partResidencesSecondaires:
        overlay.partResidencesSecondaires ?? base.partResidencesSecondaires,
      agressions: overlay.agressions ?? base.agressions,
      cambriolages: overlay.cambriolages ?? base.cambriolages,
      volsDegradations: overlay.volsDegradations ?? base.volsDegradations,
      stupefiants: overlay.stupefiants ?? base.stupefiants,
      notes: this.mergeNotes(base.notes, overlay.notes),
      noteGlobale: overlay.noteGlobale ?? base.noteGlobale,
      nbAvis: overlay.nbAvis ?? base.nbAvis,
      services: this.mergeServices(base.services, overlay.services),
      salary: this.mergeSalary(base.salary, overlay.salary),
      source: overlay.source ?? base.source,
      cityPage: overlay.cityPage ?? base.cityPage,
      avisPage: overlay.avisPage ?? base.avisPage,
      updatedAt: overlay.updatedAt ?? base.updatedAt
    };
  }

  private buildNotes(doc: RawCommuneDocument): CommuneNotes {
    return {
      environnement: this.pickNumber(doc, "note_environnement_10") ??
        this.scaleScore(this.pickNumber(doc, "score_environnement"), 2),
      transports: this.pickNumber(doc, "note_transports_10") ??
        this.scaleScore(this.pickNumber(doc, "score_transports"), 2),
      sante: this.pickNumber(doc, "note_sante_10") ??
        this.scaleScore(this.pickNumber(doc, "score_sante"), 2),
      securite: this.pickNumber(doc, "note_securite_10") ??
        this.scaleScore(this.pickNumber(doc, "score_securite"), 2),
      sportsLoisirs:
        this.pickNumber(doc, "note_sports_loisirs_10") ??
        this.scaleScore(this.pickNumber(doc, "score_loisirs"), 2),
      culture:
        this.pickNumber(doc, "note_culture_10") ??
        this.scaleScore(this.pickNumber(doc, "score_loisirs"), 2),
      enseignement:
        this.pickNumber(doc, "note_enseignement_10") ??
        this.scaleScore(this.pickNumber(doc, "score_education"), 2),
      commerces:
        this.pickNumber(doc, "note_commerces_10") ??
        this.scaleScore(this.pickNumber(doc, "score_vie_pratique"), 2),
      qualiteVie:
        this.pickNumber(doc, "note_qualite_vie_10") ??
        this.scaleScore(this.pickNumber(doc, "note_moyenne_globale"), 2) ??
        this.scaleScore(this.pickNumber(doc, "score_globale"), 2)
    };
  }

  private buildServices(doc: RawCommuneDocument): CommuneServices {
    return {
      medecins: this.asNumber(this.pickNumber(doc, "nb_medecins")),
      pharmacies: this.asNumber(this.pickNumber(doc, "nb_pharmacies")),
      hopitaux: this.asNumber(this.pickNumber(doc, "nb_hopitaux")),
      specialistes: this.sumNumbers([
        this.pickNumber(doc, "nb_dentistes"),
        this.pickNumber(doc, "nb_chirurgiens"),
        this.pickNumber(doc, "nb_dermatologues"),
        this.pickNumber(doc, "nb_anesthesistes"),
        this.pickNumber(doc, "nb_gastroenterologues"),
        this.pickNumber(doc, "nb_gynecologues"),
        this.pickNumber(doc, "nb_cancerologues"),
        this.pickNumber(doc, "nb_neurologues"),
        this.pickNumber(doc, "nb_ophtalmologues"),
        this.pickNumber(doc, "nb_orl"),
        this.pickNumber(doc, "nb_cardiologues"),
        this.pickNumber(doc, "nb_pediatres"),
        this.pickNumber(doc, "nb_pneumologues"),
        this.pickNumber(doc, "nb_psychologues"),
        this.pickNumber(doc, "nb_radiologues"),
        this.pickNumber(doc, "nb_rhumatologues"),
        this.pickNumber(doc, "nb_sages_femmes"),
        this.pickNumber(doc, "nb_laboratoires_analyses"),
        this.pickNumber(doc, "nb_etablissements_handicapes"),
        this.pickNumber(doc, "nb_ehpa")
      ]),
      creches: this.asNumber(this.pickNumber(doc, "nb_creches")),
      ecolesMaternelles: this.sumNumbers([
        this.pickNumber(doc, "nb_ecoles_maternelles_publiques"),
        this.pickNumber(doc, "nb_ecoles_maternelles_privees")
      ]),
      ecolesPrimaires: this.sumNumbers([
        this.pickNumber(doc, "nb_ecoles_primaires_publiques"),
        this.pickNumber(doc, "nb_ecoles_primaires_privees")
      ]),
      colleges: this.sumNumbers([
        this.pickNumber(doc, "nb_colleges_publics"),
        this.pickNumber(doc, "nb_colleges_prives")
      ]),
      lycees: this.sumNumbers([
        this.pickNumber(doc, "nb_lycees_publics"),
        this.pickNumber(doc, "nb_lycees_prives")
      ]),
      hypermarches: this.asNumber(this.pickNumber(doc, "nb_hypermarches")),
      supermarches: this.asNumber(this.pickNumber(doc, "nb_supermarches")),
      restaurants: this.asNumber(this.pickNumber(doc, "nb_restaurants")),
      banques: this.asNumber(this.pickNumber(doc, "nb_banques")),
      boulangeries: this.asNumber(this.pickNumber(doc, "nb_boulangeries"))
    };
  }

  private buildSalary(doc: RawCommuneDocument): CommuneSalary {
    return {
      cadre: this.asNumber(this.pickNumber(doc, "salaire_net_mensuel_moyen_cadre")),
      profIntermediaire: this.asNumber(
        this.pickNumber(doc, "salaire_net_mensuel_moyen_prof_intermediaire")
      ),
      employe: this.asNumber(this.pickNumber(doc, "salaire_net_mensuel_moyen_employe")),
      ouvrier: this.asNumber(this.pickNumber(doc, "salaire_net_mensuel_moyen_ouvrier")),
      total: this.asNumber(this.pickNumber(doc, "salaire_net_mensuel_moyen_total"))
    };
  }

  private sumNumbers(values: Array<number | null>): number | null {
    const filtered = values.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value)
    );
    if (filtered.length === 0) {
      return null;
    }

    return filtered.reduce((sum, value) => sum + value, 0);
  }

  private buildVacantResidences(doc: RawCommuneDocument): number | null {
    const explicit = this.asNumber(this.pickNumber(doc, "part_residences_vacantes"));
    if (explicit !== null) {
      return explicit;
    }

    const principales = this.asNumber(this.pickNumber(doc, "part_residences_principales"));
    const secondaires = this.asNumber(this.pickNumber(doc, "part_residences_secondaires"));
    if (principales === null || secondaires === null) {
      return null;
    }

    const vacant = 100 - principales - secondaires;
    return Math.max(0, Math.round(vacant * 10) / 10);
  }

  private deriveSize(population: number | null, metropoleName: string | null): CommuneSize {
    if (metropoleName) {
      return "metropole";
    }

    if (population === null) {
      return "ville";
    }

    if (population >= 80000) {
      return "metropole";
    }

    if (population >= 3000) {
      return "ville";
    }

    return "village";
  }

  private buildAgeDistributionFromDocument(doc: RawCommuneDocument): CommuneAgeDistributionRecord[] {
    const values = [
      { tranche: "0-14", part: this.pickNumber(doc, "part_0_14_ans") },
      { tranche: "15-29", part: this.pickNumber(doc, "part_15_29_ans") },
      { tranche: "30-44", part: this.pickNumber(doc, "part_30_44_ans") },
      { tranche: "45-59", part: this.pickNumber(doc, "part_45_59_ans") },
      { tranche: "60-74", part: this.pickNumber(doc, "part_60_74_ans") },
      { tranche: "75-89", part: this.pickNumber(doc, "part_75_89_ans") },
      { tranche: "90+", part: this.pickNumber(doc, "part_90_plus") }
    ];

    return values
      .map((item) => ({
        tranche: item.tranche,
        part: this.asNumber(item.part) ?? 0
      }))
      .filter((item) => item.part > 0);
  }

  private mergeNotes(base: CommuneNotes, overlay: CommuneNotes): CommuneNotes {
    return {
      environnement: overlay.environnement ?? base.environnement,
      transports: overlay.transports ?? base.transports,
      sante: overlay.sante ?? base.sante,
      securite: overlay.securite ?? base.securite,
      sportsLoisirs: overlay.sportsLoisirs ?? base.sportsLoisirs,
      culture: overlay.culture ?? base.culture,
      enseignement: overlay.enseignement ?? base.enseignement,
      commerces: overlay.commerces ?? base.commerces,
      qualiteVie: overlay.qualiteVie ?? base.qualiteVie
    };
  }

  private mergeServices(base: CommuneServices, overlay: CommuneServices): CommuneServices {
    return {
      medecins: overlay.medecins ?? base.medecins,
      pharmacies: overlay.pharmacies ?? base.pharmacies,
      hopitaux: overlay.hopitaux ?? base.hopitaux,
      specialistes: overlay.specialistes ?? base.specialistes,
      creches: overlay.creches ?? base.creches,
      ecolesMaternelles: overlay.ecolesMaternelles ?? base.ecolesMaternelles,
      ecolesPrimaires: overlay.ecolesPrimaires ?? base.ecolesPrimaires,
      colleges: overlay.colleges ?? base.colleges,
      lycees: overlay.lycees ?? base.lycees,
      hypermarches: overlay.hypermarches ?? base.hypermarches,
      supermarches: overlay.supermarches ?? base.supermarches,
      restaurants: overlay.restaurants ?? base.restaurants,
      banques: overlay.banques ?? base.banques,
      boulangeries: overlay.boulangeries ?? base.boulangeries
    };
  }

  private mergeSalary(base: CommuneSalary, overlay: CommuneSalary): CommuneSalary {
    return {
      cadre: overlay.cadre ?? base.cadre,
      profIntermediaire: overlay.profIntermediaire ?? base.profIntermediaire,
      employe: overlay.employe ?? base.employe,
      ouvrier: overlay.ouvrier ?? base.ouvrier,
      total: overlay.total ?? base.total
    };
  }

  private pickValue(doc: RawCommuneDocument, ...paths: string[]): unknown {
    for (const path of paths) {
      const value = this.readPath(doc, path);
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }

    return undefined;
  }

  private pickNumber(doc: RawCommuneDocument, ...paths: string[]): number | null {
    for (const path of paths) {
      const value = this.readPath(doc, path);
      const numeric = this.asNumber(value);
      if (numeric !== null) {
        return numeric;
      }
    }

    return null;
  }

  private readPath(doc: RawCommuneDocument, path: string): unknown {
    const segments = path.split(".");
    let current: unknown = doc;
    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }

  private scaleScore(value: number | null, factor: number): number | null {
    if (value === null) {
      return null;
    }

    return Math.round(value * factor * 10) / 10;
  }

  private asCode(value: unknown): string | null {
    const text = this.asString(value)?.trim().toUpperCase();
    return text || null;
  }

  private normalizeCode(value: string): string | null {
    const text = value.trim().toUpperCase();
    return text ? text : null;
  }

  private asString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();
    return text ? text : null;
  }

  private asNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }

    const numeric = Number(String(value).replace(",", ".").replace(/\s+/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  }

  private asDateString(value: unknown): string | null {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
}
