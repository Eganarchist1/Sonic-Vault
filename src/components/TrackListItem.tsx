import React from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import withObservables from '@nozbe/with-observables'
import { Ionicons } from '@expo/vector-icons'
import Track from '../database/models/Track'
import { colors } from '../theme/colors'

interface TrackListItemProps {
  track: Track
  onPress: (track: Track) => void
}

const TrackListItemBase: React.FC<TrackListItemProps> = ({ track, onPress }) => {
  const renderSyncIcon = () => {
    switch (track.syncStatus) {
      case 'DOWNLOADED':
        return <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
      case 'DOWNLOADING':
        return <Ionicons name="cloud-download-outline" size={20} color={colors.textSecondary} />
      case 'ERROR':
        return <Ionicons name="warning" size={20} color={colors.accent} />
      case 'PENDING':
      default:
        return <Ionicons name="cloud-offline-outline" size={20} color={colors.textSecondary} />
    }
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(track)}
      activeOpacity={0.7}
    >
      {track.artworkUrl ? (
        <Image source={{ uri: track.artworkUrl }} style={styles.artwork} />
      ) : (
        <View style={[styles.artwork, styles.placeholder]}>
          <Ionicons name="musical-notes" size={24} color={colors.textSecondary} />
        </View>
      )}
      
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
      </View>

      <View style={styles.statusContainer}>
        {renderSyncIcon()}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background, // Will be overridden if wrapped in glassmorphism
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  statusContainer: {
    paddingLeft: 12,
    justifyContent: 'center',
  }
})

// Enhance component to automatically re-render when the track model changes in WatermelonDB
const enhance = withObservables(['track'], ({ track }) => ({
  track: track.observe()
}))

export const TrackListItem = enhance(TrackListItemBase)
