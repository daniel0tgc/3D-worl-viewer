/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_OPENSKY_CLIENT_ID: string | undefined
  readonly VITE_OPENSKY_CLIENT_SECRET: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
