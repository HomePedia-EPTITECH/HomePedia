/**
 * Couleurs de score (compatibilité /100), partagées par les pastilles,
 * les pins de la carte et les badges : rouge → orange → jaune → vert.
 * Le calcul du score vit désormais dans `criteria.ts`.
 */

export function scoreColor(score: number): string {
  if (score >= 75) return "var(--success)"
  if (score >= 55) return "var(--warning)"
  if (score >= 40) return "oklch(0.72 0.17 55)"
  return "var(--destructive)"
}

export function scoreColorHex(score: number): string {
  if (score >= 75) return "#22c55e"
  if (score >= 55) return "#eab308"
  if (score >= 40) return "#f97316"
  return "#ef4444"
}
