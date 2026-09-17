export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/v1'

// Route WebSocket réelle exposée par le backend : /v1/stream/incidents
// (voir netalerte-backend/src/routes/stream.ts). API_BASE_URL se termine déjà
// par /v1, d'où le simple ajout du suffixe.
export const WS_URL =
  API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/stream/incidents'
