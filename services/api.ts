import * as FileSystem from 'expo-file-system'
import { CONFIG } from '../constants/config'

type ChunkUploadPayload = {
  localUri:   string
  nationalId: string
  startTime:  number
  endTime:    number
}

export async function uploadChunk(payload: ChunkUploadPayload): Promise<void> {
  // Mock upload logic for now
  console.log('[API] Mock uploading chunk to Cloudinary:', payload)
  await new Promise(resolve => setTimeout(resolve, 1000))
}

export async function camLogin(nationalId: string): Promise<{ userId: string }> {
  // Mock login logic
  if (nationalId.length !== 14 || !/^\d+$/.test(nationalId)) {
    throw new Error('Invalid NID')
  }
  return { userId: 'mock-user-id-123' }
}
