import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as SecureStore from 'expo-secure-store'
import { Ionicons, FontAwesome } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'

import { colors } from '../theme/colors'
import { WebViewLogin } from '../extractors/WebViewLogin'
import { database } from '../database'

export const SettingsScreen = () => {
  const navigation = useNavigation()
  const [spotifyLinked, setSpotifyLinked] = useState(false)
  const [youtubeLinked, setYoutubeLinked] = useState(false)
  
  const [loginPlatform, setLoginPlatform] = useState<'spotify' | 'youtube' | null>(null)

  useEffect(() => {
    checkConnections()
  }, [])

  const checkConnections = async () => {
    const spotifyToken = await SecureStore.getItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN')
    const youtubeToken = await SecureStore.getItemAsync('RES_YOUTUBE_EXTRACTED_COOKIE')
    setSpotifyLinked(!!spotifyToken)
    setYoutubeLinked(!!youtubeToken)
  }

  const handleDisconnect = async (platform: 'spotify' | 'youtube') => {
    if (platform === 'spotify') {
      await SecureStore.deleteItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN')
      setSpotifyLinked(false)
    } else {
      await SecureStore.deleteItemAsync('RES_YOUTUBE_EXTRACTED_COOKIE')
      setYoutubeLinked(false)
    }
  }

  const handleClearLibrary = async () => {
    await database.write(async () => {
      await database.unsafeResetDatabase()
    })
    console.log("Database reset")
  }

  if (loginPlatform) {
    return (
      <WebViewLogin 
        platform={loginPlatform} 
        onSuccess={() => {
          setLoginPlatform(null)
          checkConnections()
        }} 
        onCancel={() => setLoginPlatform(null)} 
      />
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#1db95440', colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <BlurView intensity={80} tint="dark" style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </BlurView>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Linked Accounts</Text>
        
        {/* Spotify Connection */}
        <View style={styles.connectionCard}>
          <View style={styles.connectionInfo}>
            <FontAwesome name="spotify" size={28} color="#1db954" />
            <Text style={styles.connectionText}>Spotify</Text>
          </View>
          {spotifyLinked ? (
            <TouchableOpacity onPress={() => handleDisconnect('spotify')} style={[styles.connectBtn, styles.disconnectBtn]}>
              <Text style={styles.btnText}>Disconnect</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setLoginPlatform('spotify')} style={styles.connectBtn}>
              <Text style={styles.btnText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* YouTube Connection */}
        <View style={styles.connectionCard}>
          <View style={styles.connectionInfo}>
            <FontAwesome name="youtube-play" size={28} color="#ff0000" />
            <Text style={styles.connectionText}>YouTube Music</Text>
          </View>
          {youtubeLinked ? (
            <TouchableOpacity onPress={() => handleDisconnect('youtube')} style={[styles.connectBtn, styles.disconnectBtn]}>
              <Text style={styles.btnText}>Disconnect</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setLoginPlatform('youtube')} style={styles.connectBtn}>
              <Text style={styles.btnText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Data Management</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearLibrary}>
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
          <Text style={styles.dangerText}>Clear Local Library</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 16,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    marginTop: 24,
  },
  connectionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 12,
  },
  connectBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disconnectBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  dangerText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  }
})
