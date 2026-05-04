import { useRef, useCallback, useState } from 'react'
import { CameraView } from 'expo-camera'
import { Paths, File } from 'expo-file-system/next'
import { useUploadQueue } from './useUploadQueue'
import { CONFIG } from '../constants/config'

type RecorderStatus = {
  isRecording:    boolean
  chunkCount:     number
  uploadedCount:  number
  queuedCount:    number
  lastUploadTime: number | null
  lastChunkUri:   string | null
}

export function useChunkRecorder(nationalId: string) {
  const cameraRef     = useRef<CameraView>(null)
  const isRunning     = useRef(false)
  const chunkCount    = useRef(0)

  const [status, setStatus] = useState<RecorderStatus>({
    isRecording:    false,
    chunkCount:     0,
    uploadedCount:  0,
    queuedCount:    0,
    lastUploadTime: null,
    lastChunkUri:   null,
  })

  const { enqueue, queueLength } = useUploadQueue(
    // On chunk uploaded successfully
    (_item) => {
      setStatus(prev => ({
        ...prev,
        uploadedCount:  prev.uploadedCount + 1,
        queuedCount:    queueLength(),
        lastUploadTime: Date.now(),
      }))
    },
    // On chunk failed after max retries
    (item) => {
      console.warn('[SentinelCam] Chunk permanently failed:', item.startTime)
      setStatus(prev => ({ ...prev, queuedCount: queueLength() }))
    }
  )

  const recordNextChunk = useCallback(async () => {
    if (!isRunning.current || !cameraRef.current) return

    const startTime = Date.now()

    try {
      // Start recording — expo-camera records to a temp cache file
      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: CONFIG.CHUNK_DURATION_MS / 1000,
      })

      // Stop recording after CHUNK_DURATION_MS
      // recordAsync resolves when stopRecording() is called or maxDuration hit
      await new Promise(resolve => setTimeout(resolve, CONFIG.CHUNK_DURATION_MS))

      if (cameraRef.current && isRunning.current) {
        cameraRef.current.stopRecording()
      }

      const recording = await recordingPromise
      const endTime   = Date.now()

      if (recording && recording.uri) {
        // Copy to a stable temp path before handing to queue
        const stablePath = `${Paths.cache.uri}chunk_${startTime}.mp4`
        const sourceFile = new File(recording.uri)
        sourceFile.move(new File(stablePath))

        chunkCount.current++
        
        // Hand off to upload queue — do NOT await, start next recording immediately
        enqueue({
          localUri:   stablePath,
          nationalId: nationalId,
          startTime:  startTime,
          endTime:    endTime,
        })

        setStatus(prev => ({
          ...prev,
          chunkCount: chunkCount.current,
          queuedCount: queueLength(),
          lastChunkUri: stablePath,
        }))
      }

    } catch (error) {
      console.error('[SentinelCam] Recording error:', error)
    }

    // Immediately start next chunk if still running
    if (isRunning.current) {
      setTimeout(recordNextChunk, 50)
    }
  }, [nationalId, enqueue, queueLength])

  const startRecording = useCallback(() => {
    if (isRunning.current) return
    isRunning.current = true
    setStatus(prev => ({ ...prev, isRecording: true }))
    recordNextChunk()
  }, [recordNextChunk])

  const stopRecording = useCallback(() => {
    isRunning.current = false
    cameraRef.current?.stopRecording()
    setStatus(prev => ({ ...prev, isRecording: false }))
  }, [])

  return { cameraRef, status, startRecording, stopRecording }
}
