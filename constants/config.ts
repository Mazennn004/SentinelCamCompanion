import Constants from "expo-constants";

const host = Constants.expoConfig?.hostUri?.split(":")[0];

const API_URL = `https://sentinel-server.up.railway.app`;

export const CONFIG = {
  CHUNK_DURATION_MS: 5000, // 5 seconds per chunk
  MAX_BUFFER_CHUNKS: 60, // 60 × 5s = 5 minutes of local rolling storage
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_BACKOFF_MS: [1000, 2000, 4000, 8000, 16000],
  API_BASE_URL: API_URL,
  CLOUDINARY_UPLOAD_ENDPOINT: "/dashcam/chunk",
} as const;
