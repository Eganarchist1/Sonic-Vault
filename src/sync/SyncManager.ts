import { database } from '../database'
import { Q } from '@nozbe/watermelondb'
import Track from '../database/models/Track'
import Playlist from '../database/models/Playlist'
import PlaylistTrack from '../database/models/PlaylistTrack'
import * as FileSystem from 'expo-file-system'

// Types representing what we'd fetch from Spotify/YouTube APIs
export interface RemoteTrack {
  remoteId: string
  source: 'spotify' | 'youtube'
  title: string
  artist: string
  artworkUrl?: string
  duration: number
}

export interface RemotePlaylist {
  remoteId: string
  source: 'spotify' | 'youtube'
  name: string
  tracks: RemoteTrack[]
}

export class SyncManager {
  /**
   * Main entry point for background sync.
   * Compares a fetched remote playlist against what is stored in WatermelonDB.
   */
  static async syncPlaylist(remotePlaylist: RemotePlaylist) {
    try {
      await database.write(async () => {
        // 1. Ensure Playlist exists locally
        let localPlaylist = await this.getOrCreatePlaylist(remotePlaylist)

        // 2. Fetch current local tracks for this playlist
        const localPlaylistTracks = await database.get<PlaylistTrack>('playlist_tracks')
          .query(Q.where('playlist_id', localPlaylist.id))
          .fetch()

        const localTrackIds = localPlaylistTracks.map(pt => pt.trackId)
        const localTracks = await database.get<Track>('tracks')
          .query(Q.where('id', Q.oneOf(localTrackIds)))
          .fetch()

        // 3. Create HashMaps for diffing
        const localTrackMap = new Map<string, Track>()
        localTracks.forEach(t => localTrackMap.set(t.remoteId, t))

        const remoteTrackMap = new Map<string, RemoteTrack>()
        remotePlaylist.tracks.forEach(rt => remoteTrackMap.set(rt.remoteId, rt))

        // 4. Calculate Diffs
        const toDownload: RemoteTrack[] = []
        const toUpdate: { local: Track; remote: RemoteTrack }[] = []
        const toDelete: Track[] = []

        // Find ToDownload & ToUpdate
        remotePlaylist.tracks.forEach(remoteTrack => {
          const localTrack = localTrackMap.get(remoteTrack.remoteId)
          if (!localTrack) {
            toDownload.push(remoteTrack)
          } else {
            // Check if metadata changed (e.g., title or artwork)
            if (localTrack.title !== remoteTrack.title || localTrack.artworkUrl !== remoteTrack.artworkUrl) {
              toUpdate.push({ local: localTrack, remote: remoteTrack })
            }
          }
        })

        // Find ToDelete (In local, but not in remote)
        localTracks.forEach(localTrack => {
          if (!remoteTrackMap.has(localTrack.remoteId)) {
            toDelete.push(localTrack)
          }
        })

        // 5. Execute DB Batch Updates
        const batchOperations: any[] = []

        // Process Deletions
        for (const track of toDelete) {
          // Mark as DELETED_REMOTELY
          batchOperations.push(
            track.prepareUpdate(t => {
              t.downloadStatus = 'DELETED_REMOTELY'
            })
          )
          // Note: Actual file deletion would happen outside the DB write lock, 
          // or in an observer on the track model.
        }

        // Process Updates
        for (const update of toUpdate) {
          batchOperations.push(
            update.local.prepareUpdate(t => {
              t.title = update.remote.title
              t.artworkUrl = update.remote.artworkUrl
            })
          )
        }

        // Process New Downloads (Insert into Tracks & PlaylistTracks)
        for (const track of toDownload) {
          // Check if track exists at all in the DB (maybe from another playlist)
          const existingTracks = await database.get<Track>('tracks').query(Q.where('remote_id', track.remoteId)).fetch()
          let newTrack: Track

          if (existingTracks.length > 0) {
            newTrack = existingTracks[0]
          } else {
            const preparedTrack = database.get<Track>('tracks').prepareCreate(t => {
              t.remoteId = track.remoteId
              t.source = track.source
              t.title = track.title
              t.artist = track.artist
              t.artworkUrl = track.artworkUrl
              t.duration = track.duration
              t.localUri = undefined
              t.downloadStatus = 'PENDING'
            })
            newTrack = preparedTrack as unknown as Track
            batchOperations.push(preparedTrack)
          }

          // Link to playlist
          const preparedLink = database.get<PlaylistTrack>('playlist_tracks').prepareCreate(pt => {
            pt.playlistId = localPlaylist.id
            pt.trackId = newTrack.id
          })
          batchOperations.push(preparedLink)
        }

        // Execute all DB changes in one transaction
        if (batchOperations.length > 0) {
          await database.batch(...batchOperations)
        }

        console.log(`Sync complete for ${remotePlaylist.name}. Download: ${toDownload.length}, Update: ${toUpdate.length}, Delete: ${toDelete.length}`)
      })

      // 6. Post-DB Operations (File System cleanup & initiation)
      // Cleanup files for deleted tracks
      await this.cleanupDeletedFiles()
      
      // Kick off background downloads for PENDING tracks
      this.initiatePendingDownloads()

    } catch (error) {
      console.error('SyncManager failed:', error)
    }
  }

  private static async getOrCreatePlaylist(remotePlaylist: RemotePlaylist): Promise<Playlist> {
    const playlistsCollection = database.get<Playlist>('playlists')
    const existing = await playlistsCollection.query(Q.where('remote_id', remotePlaylist.remoteId)).fetch()
    
    if (existing.length > 0) {
      return existing[0]
    }

    return await playlistsCollection.create(p => {
      p.name = remotePlaylist.name
      p.remoteId = remotePlaylist.remoteId
      p.source = remotePlaylist.source
    })
  }

  private static async cleanupDeletedFiles() {
    const deletedTracks = await database.get<Track>('tracks').query(Q.where('sync_status', 'DELETED_REMOTELY')).fetch()
    for (const track of deletedTracks) {
      if (track.localUri) {
        try {
          await FileSystem.deleteAsync(track.localUri, { idempotent: true })
          console.log(`Deleted file: ${track.localUri}`)
        } catch (e) {
          console.error(`Failed to delete file for track ${track.id}`, e)
        }
      }
      // Finally, destroy the record permanently
      await database.write(async () => {
        await track.destroyPermanently()
      })
    }
  }

  private static async initiatePendingDownloads() {
    // This is where we would interface with expo-file-system background downloads
    // or a third-party audio extractor.
    const pendingTracks = await database.get<Track>('tracks').query(Q.where('sync_status', 'PENDING')).fetch()
    console.log(`There are ${pendingTracks.length} pending downloads. Dispatching workers...`)
    
    // Stub for download queue logic
    // ...
  }
}
