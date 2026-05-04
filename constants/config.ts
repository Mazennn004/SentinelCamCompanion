export const CONFIG = {
  CHUNK_DURATION_MS: 5000,          // 5 seconds per chunk
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_BACKOFF_MS: [1000, 2000, 4000, 8000, 16000],  // exponential backoff
  API_BASE_URL: 'https://your-backend.com',
  CLOUDINARY_UPLOAD_ENDPOINT: '/dashcam/chunk',
} as const
