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
import { useNavigation } from '@react-navigation/native'
import { SyncManager } from '../sync/SyncManager'
import { SpotifyExtractor } from '../extractors/SpotifyExtractor'
import { YouTubeExtractor } from '../extractors/YouTubeExtractor'

interface DashboardProps {
  tracks: Track[]
}

const DashboardScreenBase: React.FC<DashboardProps> = ({ tracks }) => {
  const navigation = useNavigation<any>()
  const playbackState = usePlaybackState()
  const activeTrack = useActiveTrack()
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      let syncedCount = 0;

      const spotifyToken = await SecureStore.getItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN');
      if (spotifyToken) {
        try {
          const playlist = await SpotifyExtractor.getLikedSongs();
          await SyncManager.syncPlaylist(playlist);
          syncedCount++;
        } catch(e: any) {
          alert(`Spotify Sync Error: ${e.message}`);
        }
      }

      const youtubeToken = await SecureStore.getItemAsync('RES_YOUTUBE_EXTRACTED_COOKIE');
      if (youtubeToken) {
        try {
          // 'LM' is the standard Liked Music playlist ID on YouTube
          const playlist = await YouTubeExtractor.getPlaylist('LM');
          await SyncManager.syncPlaylist(playlist);
          syncedCount++;
        } catch(e: any) {
          alert(`YouTube Sync Error: ${e.message}`);
        }
      }

      if (syncedCount > 0) {
        alert('Sync completed successfully!');
      } else if (!spotifyToken && !youtubeToken) {
        alert('Please connect an account in Settings first.');
      }
    } catch (e: any) {
      alert(e.message || 'Error syncing library')
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePlayTrack = async (track: Track) => {
    try {
      await TrackPlayer.reset()
      await TrackPlayer.add({
        id: track.id,
        url: track.localUri || '', // Use local if downloaded, else empty for now
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

  // Login logic is now handled in the Settings screen

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
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.settingsBtn}>
          <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
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
            <Text style={styles.emptySubtext}>Link your account in Settings and click Sync.</Text>
            <TouchableOpacity 
              style={[styles.syncBtn, isSyncing && styles.syncBtnDisabled]} 
              onPress={handleSync}
              disabled={isSyncing}
            >
              <Text style={styles.syncBtnText}>{isSyncing ? 'Syncing...' : 'Sync Library Now'}</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
  },
  settingsBtn: {
    padding: 8,
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
    marginBottom: 20,
  },
  syncBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  syncBtnDisabled: {
    opacity: 0.5,
  },
  syncBtnText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
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
