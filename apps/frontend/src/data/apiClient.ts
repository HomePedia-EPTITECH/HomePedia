/**
 * Client HTTP minimal vers le back NestJS.
 *
 * Le back enveloppe systématiquement ses réponses dans `{ data: ... }`
 * (ex. `GET /communes/75056` → `{ data: { id: "75056", ... } }`).
 * `apiGet` déballe ce `.data` pour que les appelants manipulent
 * directement la donnée métier.
 *
 * Routes à la RACINE, sans préfixe /api (voir VITE_API_URL).
 */

export const BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/** Enveloppe standard des réponses du back. */
interface ApiEnvelope<T> {
  data: T
}

/**
 * GET `path` sur le back et renvoie le contenu déballé (`.data`).
 * Lève une erreur explicite si le statut HTTP n'est pas 2xx.
 *
 * @param path chemin absolu commençant par `/` (ex. `/communes/75056`)
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    throw new Error(`API GET ${path} → ${res.status} ${res.statusText}`)
  }
  const body = (await res.json()) as ApiEnvelope<T>
  return body.data
}
