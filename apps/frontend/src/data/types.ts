/**
 * Modèle de données HomePedia — dérivé du schéma réel
 * `data/exports/communes_postgres.csv`.
 *
 * Tant que le back NestJS et le pipeline Spark ne sont pas branchés,
 * ces types servent de contrat entre le mock (`data/`) et l'UI.
 */

export type TailleCommune = "village" | "ville" | "metropole"

/** Dimensions "Ville-Idéale" (notées sur 10) — utilisées pour le radar. */
export interface NotesQualiteVie {
  environnement: number
  transports: number
  sante: number
  securite: number
  sportsLoisirs: number
  culture: number
  enseignement: number
  commerces: number
  qualiteVie: number
}

export interface ServicesCommune {
  medecins: number
  pharmacies: number
  hopitaux: number
  specialistes: number
  creches: number
  ecolesMaternelles: number
  ecolesPrimaires: number
  colleges: number
  lycees: number
  hypermarches: number
  supermarches: number
  restaurants: number
  banques: number
  boulangeries: number
}

export interface AvisCommune {
  auteur: string
  note: number // /5
  sentiment: "positif" | "negatif"
  texte: string
}

export interface Commune {
  /** Code INSEE. */
  id: string
  nom: string
  codePostal: string
  departement: string
  region: string
  metropole?: string
  taille: TailleCommune

  /** Coordonnées pour Mapbox (WGS84). */
  lon: number
  lat: number

  // Démographie
  population: number
  densite: number // hab/km²
  superficie: number // km²
  ageMoyen: number
  revenuMoyen: number // €/an
  tauxChomage: number // %

  // Immobilier
  prixM2Maison: number
  prixM2Appartement: number
  partProprietaires: number // %
  partLocataires: number // %
  partResidencesPrincipales: number // %
  partResidencesSecondaires: number // %
  partResidencesVacantes: number // %
  /** Historique du prix m² (DVF). */
  prixHistorique: { annee: number; prixM2: number }[]

  // Sécurité (faits pour 1 000 habitants / an)
  agressions: number
  cambriolages: number
  volsDegradations: number
  stupefiants: number

  // Qualité de vie
  notes: NotesQualiteVie
  noteGlobale: number // /5
  nbAvis: number
  avis: AvisCommune[]

  // Répartition par tranche d'âge (% de la population)
  ageDistribution: { tranche: string; part: number }[]

  services: ServicesCommune
}

/**
 * Résultat allégé de la recherche (`GET /communes/search`) : le back ne renvoie
 * que de quoi afficher une suggestion (nom + département + région + taille).
 * On ne prétend PAS avoir une `Commune` complète ici.
 */
export type CommuneSearchResult = Pick<
  Commune,
  "id" | "nom" | "codePostal" | "departement" | "region" | "taille"
>

/**
 * Moyennes nationales (`GET /stats/national`) servant de repère de comparaison
 * sur la fiche commune (sécurité, chômage…).
 */
export type NationalStats = Pick<
  Commune,
  | "agressions"
  | "cambriolages"
  | "volsDegradations"
  | "stupefiants"
  | "prixM2Appartement"
  | "tauxChomage"
>

// Le modèle de critères / scoring (importance, sous-critères) vit dans
// `criteria.ts`. Ce fichier ne décrit plus que la donnée "commune".
