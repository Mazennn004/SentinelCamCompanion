import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useChunkRecorder } from '../hooks/useChunkRecorder'

export default function RecordingScreen() {
  const router  = useRouter()
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [micPermission, requestMicPermission] = useMicrophonePermissions()
  const [nationalId, setNationalId] = useState<string | null>(null)

  useEffect(() => {
    AsyncStorage.getItem('nationalId').then(id => {
      if (!id) { router.replace('/'); return }
      setNationalId(id)
    })
  }, [])

  useEffect(() => {
    if (cameraPermission && !cameraPermission.granted) {
      requestCameraPermission()
    }
    if (micPermission && !micPermission.granted) {
      requestMicPermission()
    }
  }, [cameraPermission, micPermission])

  const { cameraRef, status, startRecording, stopRecording } =
    useChunkRecorder(nationalId ?? '')

  // Auto-start recording once nationalId is loaded and permission granted
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

  const bufferSeconds = status.uploadedCount * 5
  const bufferMinutes = Math.floor(bufferSeconds / 60)
  const bufferSecs    = bufferSeconds % 60

  return (
    <View style={{ flex: 1, backgroundColor: '#060A0F' }}>

      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        facing="back"
        mode="video"
        style={{ width: '100%', aspectRatio: 16 / 9 }}
      />

      {/* Status Panel */}
      <View style={{ flex: 1, padding: 20, gap: 12 }}>

        <Text style={{ color: '#00B4C6', fontSize: 11, fontWeight: '700',
          letterSpacing: 2, textTransform: 'uppercase' }}>
          Recording Status
        </Text>

        <StatusRow label="Recording"
          value={status.isRecording ? '● LIVE' : '○ STOPPED'}
          valueColor={status.isRecording ? '#00E68A' : '#FF3B5C'} />

        <StatusRow label="Chunks Recorded"   value={`${status.chunkCount}`} />
        <StatusRow label="Chunks Uploaded (Cloudinary)"   value={`${status.uploadedCount}`} />
        <StatusRow label="In Upload Queue"   value={`${status.queuedCount}`} />
        <StatusRow label="Cloud Buffer"
          value={`${bufferMinutes}m ${bufferSecs}s / 5m 00s`} />

        {status.lastUploadTime && (
          <StatusRow label="Last Upload"
            value={new Date(status.lastUploadTime).toLocaleTimeString()} />
        )}

        {/* {status.lastChunkUri && (
          <TouchableOpacity
            onPress={() => router.push(`/preview?uri=${encodeURIComponent(status.lastChunkUri!)}`)}
            style={{
              backgroundColor: 'rgba(0,180,198,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(0,180,198,0.3)',
              borderRadius: 14,
              height: 56,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ color: '#00B4C6', fontWeight: '700', fontSize: 16 }}>
              Preview Last Chunk
            </Text>
          </TouchableOpacity>
        )} */}

        {/* Stop button */}
        <TouchableOpacity
          onPress={() => {
            stopRecording();
            router.replace('/');
          }}
          style={{
            marginTop: 'auto',
            backgroundColor: 'rgba(255,59,92,0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255,59,92,0.3)',
            borderRadius: 14,
            height: 56,
            justifyContent: 'center',
            alignItems: 'center',
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
