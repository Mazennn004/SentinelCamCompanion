import { useRef, useCallback, useState } from 'react'
import { CameraView } from 'expo-camera'
import { Paths, File } from 'expo-file-system/next'
import { useRollingBuffer } from './useRollingBuffer'
import { CONFIG } from '../constants/config'

type RecorderStatus = {
  isRecording:   boolean
  chunkCount:    number   // total chunks recorded this session
  bufferSize:    number   // current chunks in the rolling buffer
  lastChunkUri:  string | null
}

export function useChunkRecorder(nationalId: string) {
  const cameraRef  = useRef<CameraView>(null)
  const isRunning  = useRef(false)
  const chunkCount = useRef(0)

  const [status, setStatus] = useState<RecorderStatus>({
    isRecording:  false,
    chunkCount:   0,
    bufferSize:   0,
    lastChunkUri: null,
  })

  const { addChunk, getLatestChunk, getBufferSize, emptyBuffer } = useRollingBuffer()

  const recordNextChunk = useCallback(async () => {
    if (!isRunning.current || !cameraRef.current) return

    const startTime = Date.now()

    try {
      // Start recording — expo-camera records to a temp cache file
      const recordingPromise = cameraRef.current.recordAsync({
        maxDuration: CONFIG.CHUNK_DURATION_MS / 1000,
      })

      // Wait for CHUNK_DURATION_MS then stop
      await new Promise(resolve => setTimeout(resolve, CONFIG.CHUNK_DURATION_MS))

      if (cameraRef.current && isRunning.current) {
        cameraRef.current.stopRecording()
      }

      const recording = await recordingPromise

      if (recording && recording.uri) {
        // Move to a stable cache path
        const stablePath = `${Paths.cache.uri}chunk_${startTime}.mp4`
        const sourceFile = new File(recording.uri)
        sourceFile.move(new File(stablePath))

        chunkCount.current++

        // Add to rolling buffer (handles eviction of oldest if full)
        addChunk(stablePath)

        setStatus({
          isRecording:  true,
          chunkCount:   chunkCount.current,
          bufferSize:   getBufferSize(),
          lastChunkUri: stablePath,
        })
      }
    } catch (error) {
      console.error('[SentinelCam] Recording error:', error)
    }

    // Immediately start next chunk if still running
    if (isRunning.current) {
      setTimeout(recordNextChunk, 50)
    }
  }, [addChunk, getBufferSize])

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

  const clearBuffer = useCallback(() => {
    emptyBuffer()
    setStatus(prev => ({
      ...prev,
      bufferSize: 0,
      lastChunkUri: null
    }))
  }, [emptyBuffer])

  return {
    cameraRef,
    status,
    startRecording,
    stopRecording,
    getLatestChunk,   // exposed so recording.tsx can pass it to usePushNotifications
    clearBuffer,      // exposed to clear buffer after upload
  }
}
