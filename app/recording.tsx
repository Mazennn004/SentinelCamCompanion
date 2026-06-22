import { useEffect, useState ,useRef} from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useChunkRecorder } from '../hooks/useChunkRecorder'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { CONFIG } from '../constants/config'
import { disconnect } from '@/services/api'
export default function RecordingScreen() {
  const router  = useRouter()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [micPermission, requestMicPermission]       = useMicrophonePermissions()
  const [nationalId, setNationalId]                 = useState<string | null>(null)
  const token=useRef<string | null>(null)
  useEffect(() => {
    AsyncStorage.getItem('accessToken').then(id => {
      if (!id) { router.replace('/'); return }
      token.current=id
      setNationalId(id)
    })
    return ()=> void disconnect(token.current ?? '')
  }, [])

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted) requestCameraPermission()
    if (micPermission    && !micPermission.granted)    requestMicPermission()
  }, [cameraPermission, micPermission])

  const { cameraRef, status, startRecording, stopRecording, getLatestChunk, clearBuffer } =
    useChunkRecorder(nationalId ?? '')

  // Push notification listener — uploads latest chunk when a notification arrives
  const { tokenRef } = usePushNotifications(getLatestChunk, clearBuffer, nationalId ?? '')

  // Auto-start once all permissions are ready
  useEffect(() => {
    if (nationalId && cameraPermission?.granted && micPermission?.granted) {
      startRecording()
    }
    return () => stopRecording()
  }, [nationalId, cameraPermission?.granted, micPermission?.granted])

 
  if (!cameraPermission?.granted || !micPermission?.granted || !nationalId) {
    return (
      <View style={{ flex: 1, backgroundColor: '#060A0F', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>Requesting permissions...</Text>
      </View>
    )
  }

  // Buffer progress: e.g. "00:45 / 05:00"
  const bufferTotalSecs = status.bufferSize * (CONFIG.CHUNK_DURATION_MS / 1000)
  const maxSecs         = CONFIG.MAX_BUFFER_CHUNKS * (CONFIG.CHUNK_DURATION_MS / 1000)
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const bufferLabel = `${fmt(bufferTotalSecs)} / ${fmt(maxSecs)}`
  const bufferPct   = Math.round((status.bufferSize / CONFIG.MAX_BUFFER_CHUNKS) * 100)

  return (
    <View style={{ flex: 1, backgroundColor: '#060A0F' }}>

      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        videoQuality="1080p"
        facing="back"
        mode="video" 
        style={StyleSheet.absoluteFillObject}
      />

      {/* Status Panel (Optimized for Landscape) */}
      <View style={{ 
        position: 'absolute', 
        top: 0, bottom: 0, right: 0, 
        width: 320,
        padding: 24, gap: 12, 
        backgroundColor: 'rgba(6, 10, 15, 0.85)',
        borderTopLeftRadius: 24,
        borderBottomLeftRadius: 24,
        justifyContent: 'center'
      }}>

        <Text style={{ color: '#00B4C6', fontSize: 11, fontWeight: '700',
          letterSpacing: 2, textTransform: 'uppercase' }}>
          Recording Status
        </Text>

        <StatusRow
          label="Recording"
          value={status.isRecording ? '● LIVE' : '○ STOPPED'}
          valueColor={status.isRecording ? '#00E68A' : '#FF3B5C'}
        />

        <StatusRow label="Chunks Recorded"  value={`${status.chunkCount}`} />
        <StatusRow label="Buffer"            value={`${status.bufferSize} chunks · ${bufferLabel} · ${bufferPct}%`} />

        <StatusRow
          label="Push Notifications"
          value={tokenRef.current ? '✓ Ready' : 'Pending…'}
          valueColor={tokenRef.current ? '#00E68A' : 'rgba(255,255,255,0.4)'}
        />

        {/* Preview last chunk button */}
        {status.lastChunkUri && (
          <TouchableOpacity
            onPress={() => router.push(`/preview?uri=${encodeURIComponent(status.lastChunkUri!)}`)}
            style={{
              backgroundColor:  'rgba(0,180,198,0.1)',
              borderWidth:       1,
              borderColor:      'rgba(0,180,198,0.3)',
              borderRadius:      14,
              height:            50,
              justifyContent:   'center',
              alignItems:       'center',
            }}
          >
            <Text style={{ color: '#00B4C6', fontWeight: '700', fontSize: 15 }}>
              Preview Last Chunk
            </Text>
          </TouchableOpacity>
        )}

        {/* Stop button */}
        <TouchableOpacity
          onPress={() => { stopRecording();clearBuffer(); router.replace('/') }}
          style={{
            marginTop:        20,
            backgroundColor: 'rgba(255,59,92,0.1)',
            borderWidth:      1,
            borderColor:     'rgba(255,59,92,0.3)',
            borderRadius:     14,
            height:           56,
            justifyContent:  'center',
            alignItems:      'center',
          }}
        >
          <Text style={{ color: '#FF3B5C', fontWeight: '700', fontSize: 16 }}>
            Stop Recording & Exit
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function StatusRow({
  label, value, valueColor = 'white'
}: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: 10, borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.05)' }}>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: valueColor, fontSize: 13, fontWeight: '600',
        fontFamily: 'monospace' }}>{value}</Text>
    </View>
  )
}
