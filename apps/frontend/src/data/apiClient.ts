/**
 * Client HTTP minimal vers le back NestJS.
 *
 * Le back enveloppe systématiquement ses réponses dans `{ data: ... }`
 * pour la plupart des routes. Certaines routes de pagination renvoient le
 * payload brut (`{ data, meta }`), d'où le couple `apiGet` / `apiPost`.
 *
 * Routes à la RACINE, sans préfixe /api (voir VITE_API_URL).
 */

export const BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/** Enveloppe standard des réponses du back. */
interface ApiEnvelope<T> {
  data: T
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${path} → ${res.status} ${res.statusText}`,
    )
  }
  return (await res.json()) as T
}

/**
 * GET `path` sur le back et renvoie le contenu déballé (`.data`).
 * Lève une erreur explicite si le statut HTTP n'est pas 2xx.
 *
 * @param path chemin absolu commençant par `/` (ex. `/communes/75056`)
 */
export async function apiGet<T>(path: string): Promise<T> {
  const body = await apiRequest<ApiEnvelope<T>>(path)
  return body.data
}

/**
 * POST `path` sur le back et renvoie la réponse brute.
 * Utilisé pour les routes qui ne sont pas enveloppées dans `{ data: ... }`.
 */
export async function apiPost<T, B = unknown>(
  path: string,
  body: B,
): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}
