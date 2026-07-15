import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, StatusBar, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import withObservables from '@nozbe/with-observables'
import { Ionicons } from '@expo/vector-icons'
import TrackPlayer, { State, usePlaybackState, useActiveTrack } from 'react-native-track-player'
import * as SecureStore from 'expo-secure-store'

import { database } from '../database'
import Track from '../database/models/Track'
import { TrackListItem } from '../components/TrackListItem'
import { colors } from '../theme/colors'
import { WebViewLogin } from '../extractors/WebViewLogin'

interface DashboardProps {
  tracks: Track[]
}

const DashboardScreenBase: React.FC<DashboardProps> = ({ tracks }) => {
  const [needsLogin, setNeedsLogin] = useState<boolean>(false)
  const [loginPlatform, setLoginPlatform] = useState<'spotify'|'youtube'>('spotify')
  const playbackState = usePlaybackState()
  const activeTrack = useActiveTrack()

  useEffect(() => {
    // Check if we have the extracted web tokens
    SecureStore.getItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN').then(token => {
      if (!token) {
        setLoginPlatform('spotify')
        setNeedsLogin(true)
      }
    })
  }, [])

  const handlePlayTrack = async (track: Track) => {
    try {
      await TrackPlayer.reset()
      await TrackPlayer.add({
        id: track.id,
        url: track.localPath || track.remoteUrl, // Use local if downloaded, else stream
        title: track.title,
        artist: track.artist,
        artwork: track.artworkUrl,
      })
      await TrackPlayer.play()
    } catch (e) {
      console.error('Failed to play track', e)
    }
  }

  const togglePlayback = async () => {
    if (playbackState.state === State.Playing) {
      await TrackPlayer.pause()
    } else {
      await TrackPlayer.play()
    }
  }

  if (needsLogin) {
    return (
      <WebViewLogin 
        platform={loginPlatform} 
        onSuccess={() => setNeedsLogin(false)} 
        onCancel={() => setNeedsLogin(false)} 
      />
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Dynamic Background Gradient */}
      <LinearGradient
        colors={['#1db95440', colors.background]}
        style={StyleSheet.absoluteFill}
      />

      {/* Glassmorphism Header */}
      <BlurView intensity={80} tint="dark" style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
      </BlurView>

      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TrackListItem 
            track={item} 
            onPress={handlePlayTrack} 
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tracks synced yet.</Text>
            <Text style={styles.emptySubtext}>Waiting for background sync engine...</Text>
          </View>
        }
      />

      {/* Mini Player */}
      {activeTrack && (
        <BlurView intensity={100} tint="dark" style={styles.miniPlayer}>
          <View style={styles.miniPlayerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.miniPlayerTitle} numberOfLines={1}>{activeTrack.title}</Text>
              <Text style={styles.miniPlayerArtist} numberOfLines={1}>{activeTrack.artist}</Text>
            </View>
            <TouchableOpacity onPress={togglePlayback} style={styles.playPauseBtn}>
              <Ionicons 
                name={playbackState.state === State.Playing ? 'pause' : 'play'} 
                size={28} 
                color={colors.textPrimary} 
              />
            </TouchableOpacity>
          </View>
        </BlurView>
      )}
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
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 100, // Leave room for bottom player sheet
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 8,
  },
  miniPlayer: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  miniPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  miniPlayerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  miniPlayerArtist: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  playPauseBtn: {
    padding: 8,
  }
})

// Bind the component to the tracks table, sorted by creation date
const enhance = withObservables([], () => ({
  tracks: database.collections.get<Track>('tracks').query().observe()
}))

export const DashboardScreen = enhance(DashboardScreenBase)
