import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import { SyncManager } from './SyncManager'

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_TASK'

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const now = new Date()
    console.log(`[${now.toISOString()}] Background sync executing...`)

    // In a real scenario, we would pull the users configured playlists
    // from the DB and hit the remote APIs (Spotify/YouTube) to get the latest arrays.
    // For now, we mock fetching a remote playlist to trigger the diffing engine.

    const mockRemoteFetch = {
      remoteId: 'yt-playlist-123',
      source: 'youtube' as const,
      name: 'Chill Vibes',
      tracks: [
        {
          remoteId: 'yt-track-A',
          source: 'youtube' as const,
          title: 'A New Song',
          artist: 'Artist A',
          duration: 180,
        }
      ]
    }

    await SyncManager.syncPlaylist(mockRemoteFetch)

    // Return successful result so the OS knows it worked
    return BackgroundFetch.BackgroundFetchResult.NewData
  } catch (error) {
    console.error('Background task failed:', error)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

// Function to register the task, called from App.tsx/index.ts
export async function registerBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 60 * 15, // 15 minutes
      stopOnTerminate: false,   // android only
      startOnBoot: true,        // android only
    })
    console.log('Background sync registered.')
  } catch (err) {
    console.error('Failed to register background sync:', err)
  }
}

export async function unregisterBackgroundSync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK)
    console.log('Background sync unregistered.')
  } catch (err) {
    console.error('Failed to unregister background sync:', err)
  }
}
