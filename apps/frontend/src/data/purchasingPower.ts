import type { Commune } from "./types"

/**
 * Pouvoir d'achat : ce que représente un salaire net mensuel dans une ville.
 * Hypothèses volontairement simples et lisibles (mock, ajustables plus tard) :
 *  - Taux d'effort logement sain = 33 % du salaire net.
 *  - Capacité d'emprunt ≈ 4 × salaire annuel net (ordre de grandeur courtier).
 *  - Loyer mensuel estimé ≈ prix m² appartement / 200 (rendement locatif ~6 %/an).
 */

const TAUX_EFFORT = 0.33
const ANNEES_EMPRUNT_EQUIV = 4
const LOYER_M2_DIVISEUR = 200

export interface PurchasingPower {
  /** Loyer mensuel soutenable (33 % du salaire). */
  loyerSoutenable: number
  /** Loyer mensuel estimé au m² dans la ville. */
  loyerM2: number
  /** Surface louable confortablement (m²). */
  surfaceLouable: number
  /** Capacité d'emprunt totale estimée (€). */
  capaciteEmprunt: number
  /** Surface achetable avec cette capacité (m², appartement). */
  surfaceAchetable: number
  /** Reste à vivre mensuel après un loyer "type" (ici surface louable). */
  resteAVivre: number
  /** Écart du salaire vs revenu moyen mensuel local (ratio, 1 = équivalent). */
  ratioVsLocal: number
}

/** Revenu moyen local ramené au mensuel net (approx : /12, déjà "moyen"). */
function revenuMensuelLocal(c: Commune): number {
  return Number.isFinite(c.revenuMoyen) && c.revenuMoyen > 0
    ? c.revenuMoyen / 12
    : 0
}

export function purchasingPower(
  commune: Commune,
  salaireNetMensuel: number,
): PurchasingPower {
  const loyerSoutenable = salaireNetMensuel * TAUX_EFFORT
  const loyerM2 = commune.prixM2Appartement / LOYER_M2_DIVISEUR
  const surfaceLouable = loyerM2 > 0 ? loyerSoutenable / loyerM2 : 0

  const capaciteEmprunt = salaireNetMensuel * 12 * ANNEES_EMPRUNT_EQUIV
  const surfaceAchetable =
    commune.prixM2Appartement > 0
      ? capaciteEmprunt / commune.prixM2Appartement
      : 0

  const resteAVivre = salaireNetMensuel - loyerSoutenable
  const revenuLocal = revenuMensuelLocal(commune)
  const ratioVsLocal = revenuLocal > 0 ? salaireNetMensuel / revenuLocal : 0

  return {
    loyerSoutenable: Math.round(loyerSoutenable),
    loyerM2: Math.round(loyerM2 * 10) / 10,
    surfaceLouable: Math.round(surfaceLouable),
    capaciteEmprunt: Math.round(capaciteEmprunt),
    surfaceAchetable: Math.round(surfaceAchetable),
    resteAVivre: Math.round(resteAVivre),
    ratioVsLocal: Math.round(ratioVsLocal * 100) / 100,
  }
}
