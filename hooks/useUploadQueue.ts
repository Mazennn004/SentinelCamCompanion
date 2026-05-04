import { useRef, useCallback } from 'react'
import { File } from 'expo-file-system/next'
import { uploadChunk } from '../services/api'
import { CONFIG } from '../constants/config'

type QueueItem = {
  localUri:   string
  nationalId: string
  startTime:  number
  endTime:    number
  attempts:   number
}

export function useUploadQueue(
  onChunkUploaded: (item: QueueItem) => void,
  onChunkFailed:   (item: QueueItem) => void,
) {
  const queue       = useRef<QueueItem[]>([])
  const processing  = useRef(false)

  const processQueue = useCallback(async () => {
    if (processing.current || queue.current.length === 0) return
    processing.current = true

    while (queue.current.length > 0) {
      const item = queue.current[0]

      try {
        // Upload chunk to backend (currently mocked for Cloudinary)
        await uploadChunk({
          localUri:   item.localUri,
          nationalId: item.nationalId,
          startTime:  item.startTime,
          endTime:    item.endTime,
        })

        // SUCCESS — remove from queue, delete local temp file
        queue.current.shift()
        new File(item.localUri).delete() // Commented out to allow previewing
        console.log("Chunk stored at:", item.localUri);
        onChunkUploaded(item)

      } catch (error) {
        item.attempts++

        if (item.attempts >= CONFIG.MAX_RETRY_ATTEMPTS) {
          // Give up on this chunk after max retries
          queue.current.shift()
          onChunkFailed(item)
        } else {
          // Backoff before retrying
          const delay = CONFIG.RETRY_BACKOFF_MS[item.attempts - 1] ?? 16000
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    processing.current = false
  }, [onChunkUploaded, onChunkFailed])

  const enqueue = useCallback((item: Omit<QueueItem, 'attempts'>) => {
    queue.current.push({ ...item, attempts: 0 })
    processQueue()
  }, [processQueue])

  return { enqueue, queueLength: () => queue.current.length }
}
