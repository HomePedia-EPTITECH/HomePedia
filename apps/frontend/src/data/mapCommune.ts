import type { Commune } from "./types"

/**
 * Forme brute d'une commune renvoyée par le back.
 *
 * Aujourd'hui, une commune enrichie (ex. Paris) correspond exactement au
 * type `Commune`. Mais les communes non enrichies peuvent arriver sans leurs
 * tableaux (`prixHistorique`, `avis`, `ageDistribution`) — d'où le `Partial`
 * sur ces champs.
 *
 * NB : la gestion « N.C. » des scalaires manquants (prix, revenu, notes → null)
 * viendra dans un chantier dédié, quand on chargera les ~34k communes. Pour
 * l'instant, cet adaptateur ne défend que les tableaux, afin que le rendu de la
 * page détail ne plante jamais sur une commune creuse.
 */
export type RawCommune = Omit<
  Commune,
  "prixHistorique" | "avis" | "ageDistribution"
> &
  Partial<Pick<Commune, "prixHistorique" | "avis" | "ageDistribution">>

/**
 * Traduit la donnée brute du back vers le type `Commune` du front.
 * Point d'entrée UNIQUE de la conversion : toute politique « données
 * manquantes » se décide ici, jamais dans les composants.
 */
export function mapCommune(raw: RawCommune): Commune {
  return {
    ...raw,
    prixHistorique: raw.prixHistorique ?? [],
    avis: raw.avis ?? [],
    ageDistribution: raw.ageDistribution ?? [],
  }
}
