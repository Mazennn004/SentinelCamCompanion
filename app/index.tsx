import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { camLogin } from '../services/api'

export default function LoginScreen() {
  const router  = useRouter()
  const [nid,   setNid]     = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (nid.length !== 14 || !/^\d+$/.test(nid)) {
      setError('Enter a valid 14-digit National ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { userId } = await camLogin(nid)
      await AsyncStorage.setItem('nationalId', nid)
      await AsyncStorage.setItem('userId', userId)
      router.replace('/recording')
    } catch {
      setError('Login failed. Check your National ID and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#060A0F', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#00B4C6', fontSize: 26, fontWeight: '800', marginBottom: 8 }}>
        Sentinel Cam
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 40 }}>
        Dashcam simulation tool
      </Text>

      <TextInput
        value={nid}
        onChangeText={setNid}
        placeholder="14-digit National ID"
        placeholderTextColor="rgba(255,255,255,0.15)"
        keyboardType="numeric"
        maxLength={14}
        style={{
          backgroundColor: 'rgba(10,18,30,0.8)',
          borderRadius: 14,
          paddingHorizontal: 16,
          height: 56,
          color: 'white',
          fontSize: 16,
          fontFamily: 'monospace',
          borderWidth: 1,
          borderColor: 'rgba(0,180,200,0.1)',
          marginBottom: 16,
        }}
      />

      {error ? (
        <Text style={{ color: '#FF3B5C', fontSize: 13, marginBottom: 16 }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{
          backgroundColor: '#00B4C6',
          borderRadius: 14,
          height: 56,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {loading
          ? <ActivityIndicator color="#060A0F" />
          : <Text style={{ color: '#060A0F', fontWeight: '700', fontSize: 16 }}>Start Recording</Text>
        }
      </TouchableOpacity>
    </View>
  )
}
