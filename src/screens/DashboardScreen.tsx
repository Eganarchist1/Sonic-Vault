import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, StatusBar } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import withObservables from '@nozbe/with-observables'
import { database } from '../database'
import Track from '../database/models/Track'
import { TrackListItem } from '../components/TrackListItem'
import { colors } from '../theme/colors'
import { WebViewLogin } from '../extractors/WebViewLogin'
import * as SecureStore from 'expo-secure-store'

interface DashboardProps {
  tracks: Track[]
}

const DashboardScreenBase: React.FC<DashboardProps> = ({ tracks }) => {
  const [needsLogin, setNeedsLogin] = useState<boolean>(false)
  const [loginPlatform, setLoginPlatform] = useState<'spotify'|'youtube'>('spotify')

  useEffect(() => {
    // Check if we have the extracted web tokens
    SecureStore.getItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN').then(token => {
      if (!token) {
        setLoginPlatform('spotify')
        setNeedsLogin(true)
      }
    })
  }, [])

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
            onPress={(t) => console.log('Play track:', t.title)} 
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tracks synced yet.</Text>
            <Text style={styles.emptySubtext}>Waiting for background sync engine...</Text>
          </View>
        }
      />
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
  }
})

// Bind the component to the tracks table, sorted by creation date
const enhance = withObservables([], () => ({
  tracks: database.collections.get<Track>('tracks').query().observe()
}))

export const DashboardScreen = enhance(DashboardScreenBase)
