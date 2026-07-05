/**
 * Client HTTP minimal vers le back NestJS.
 *
 * Le back enveloppe systÃ©matiquement ses rÃ©ponses dans `{ data: ... }`
 * pour la plupart des routes. Certaines routes de pagination renvoient le
 * payload brut (`{ data, meta }`), d'oÃ¹ le couple `apiGet` / `apiPost`.
 *
 * Routes Ã  la RACINE, sans prÃ©fixe /api (voir VITE_API_URL).
 */

export const BASE_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"

/** Enveloppe standard des rÃ©ponses du back. */
interface ApiEnvelope<T> {
  data: T
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) {
    throw new Error(
      `${init?.method ?? "GET"} ${path} â†’ ${res.status} ${res.statusText}`,
    )
  }
  return (await res.json()) as T
}

/**
 * GET `path` sur le back et renvoie le contenu dÃ©ballÃ© (`.data`).
 * LÃ¨ve une erreur explicite si le statut HTTP n'est pas 2xx.
 *
 * @param path chemin absolu commenÃ§ant par `/` (ex. `/communes/75056`)
 */
export async function apiGet<T>(path: string): Promise<T> {
  const body = await apiRequest<ApiEnvelope<T>>(path)
  return body.data
}

/**
 * POST `path` sur le back et renvoie la rÃ©ponse brute.
 * UtilisÃ© pour les routes qui ne sont pas enveloppÃ©es dans `{ data: ... }`.
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
