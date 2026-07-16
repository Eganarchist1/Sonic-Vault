import TrackPlayer, { Capability } from 'react-native-track-player'

export async function setupPlayer() {
  let isSetup = false
  try {
    // Check if player is already setup
    await TrackPlayer.getActiveTrack()
    return true
  } catch {
    await TrackPlayer.setupPlayer()
    
    // Configure how the OS displays the controls in the background
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 2,
    })
    
    return true
  }
}
