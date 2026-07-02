/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPBOX_TOKEN: string
  /** URL de style Mapbox (défaut : mapbox://styles/mapbox/standard). */
  readonly VITE_MAPBOX_STYLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
