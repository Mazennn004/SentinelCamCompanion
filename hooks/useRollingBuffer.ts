import { useRef, useCallback } from 'react'
import { File } from 'expo-file-system/next'
import { CONFIG } from '../constants/config'

/**
 * Circular rolling buffer for dashcam chunks.
 *
 * - Holds at most CONFIG.MAX_BUFFER_CHUNKS entries (default = 60 → 5 minutes)
 * - When full, the oldest chunk is deleted from storage before the new one is added
 * - All access is via stable refs so callers don't need to worry about stale closures
 */
export function useRollingBuffer() {
  // Array of local file URIs ordered oldest → newest
  const buffer = useRef<string[]>([])

  /**
   * Add a new chunk URI to the buffer.
   * If the buffer is already at capacity, the oldest chunk is deleted and removed.
   */
  const addChunk = useCallback((uri: string) => {
    if (buffer.current.length >= CONFIG.MAX_BUFFER_CHUNKS) {
      const oldest = buffer.current.shift()!
      try {
        new File(oldest).delete()
        console.log('[RollingBuffer] Evicted oldest chunk:', oldest)
      } catch (e) {
        console.warn('[RollingBuffer] Failed to delete evicted chunk:', oldest, e)
      }
    }

    buffer.current.push(uri)
    console.log(
      `[RollingBuffer] Added chunk. Buffer size: ${buffer.current.length}/${CONFIG.MAX_BUFFER_CHUNKS}`
    )
  }, [])

  /** Returns the most recent chunk URI, or null if the buffer is empty. */
  const getLatestChunk = useCallback((): string | null => {
    return buffer.current[buffer.current.length - 1] ?? null
  }, [])

  /** Returns the current number of chunks in the buffer. */
  const getBufferSize = useCallback((): number => {
    return buffer.current.length
  }, [])

  /** Empties the buffer and deletes all chunks from storage. */
  const emptyBuffer = useCallback(() => {
    const items = [...buffer.current]
    buffer.current = []
    
    items.forEach(uri => {
      try {
        new File(uri).delete()
      } catch (e) {
        console.warn('[RollingBuffer] Failed to delete chunk during empty:', uri, e)
      }
    })
    console.log(`[RollingBuffer] Emptied ${items.length} chunks.`)
  }, [])

  return { addChunk, getLatestChunk, getBufferSize, emptyBuffer }
}
