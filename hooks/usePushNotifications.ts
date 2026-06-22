import { useEffect, useRef, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { updatePushNotificationKeyService, uploadChunk } from '../services/api'

const PUSH_TOKEN_KEY = 'sentinelcam_push_token'

/**
 * Manages push notification permissions, push token registration,
 * and listens for incoming notifications to trigger dashcam chunk upload.
 *
 * @param getLatestChunk - callback that returns the most recent chunk URI from the rolling buffer
 * @param clearBuffer    - callback to empty the buffer after successful upload
 * @param nationalId     - the logged-in driver's NID, sent with the upload
 */
export function usePushNotifications(
  getLatestChunk: () => string | null,
  clearBuffer: () => void,
  nationalId: string
) {
  const tokenRef = useRef<string | null>(null)

  // ── 1. Register push token on mount ──────────────────────────────────────
  useEffect(() => {
    async function registerToken() {
      // Android requires an explicit notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('sentinel-cam', {
          name: 'Sentinel Cam',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
        })
      }

      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.warn('[PushNotif] Permission not granted — push notifications disabled.')
        return
      }

      // Get Expo push token (requires a physical device or Android emulator with GMS)
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync()
     
        const accessToken=await AsyncStorage.getItem("accessToken")
        if(!accessToken){
          throw new Error("User not found")
        }
        const token = tokenData.data
        const res=await updatePushNotificationKeyService(token,accessToken);
      
        
        
        // Log and persist
        console.log('[PushNotif] Expo Push Token:', token)
        tokenRef.current = token
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
      } catch (e) {
        console.warn('[PushNotif] Could not get push token:', e)
      }
    }

    registerToken()
  }, [])

  // ── 2. Listen for incoming notifications ─────────────────────────────────
  const handleNotification = useCallback(
    async (notification: Notifications.Notification) => {
      console.log('[PushNotif] Notification received:', JSON.stringify(notification))

      const latestUri = getLatestChunk()
      if (!latestUri) {
        console.warn('[PushNotif] Notification received but rolling buffer is empty.')
        return
      }

      // Extract optional timestamp from notification payload
      const payload = notification.request.content.data as Record<string, unknown>
      const triggerTime = typeof payload?.timestamp === 'number'
        ? payload.timestamp
        : Date.now()

        const accessToken=await AsyncStorage.getItem("accessToken")
        if(!accessToken){
          throw new Error("User not found")
        }
      try {
        await uploadChunk({
          localUri:   latestUri,
          accessToken: accessToken,
        
        })
        console.log('[PushNotif] Upload triggered successfully.')
        clearBuffer()
      } catch (e) {
        console.error('[PushNotif] Upload failed:', e)
      }
    },
    [getLatestChunk, clearBuffer, nationalId]
  )

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(handleNotification)
    return () => subscription.remove()
  }, [handleNotification])

  return { tokenRef }
}
