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

/** Critères pondérables du score personnalisé (0–100 % chacun). */
export interface Weights {
  prix: number
  securite: number
  qualiteVie: number
  ecoles: number
  sante: number
  revenus: number
}

/** Sous-scores normalisés d'une commune (0–100, "plus c'est haut, mieux c'est"). */
export interface ScoreBreakdown {
  prix: number
  securite: number
  qualiteVie: number
  ecoles: number
  sante: number
  revenus: number
}

export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  prix: "Prix immobilier m²",
  securite: "Sécurité",
  qualiteVie: "Qualité de vie",
  ecoles: "Écoles",
  sante: "Services de santé",
  revenus: "Revenus médians",
}

export const DEFAULT_WEIGHTS: Weights = {
  prix: 70,
  securite: 60,
  qualiteVie: 55,
  ecoles: 40,
  sante: 40,
  revenus: 45,
}
