import TrackPlayer, { Event } from 'react-native-track-player'

// This service needs to be registered right outside of the React lifecycle.
// It listens to events from the OS (lock screen controls, headphones, etc.)
export async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play())
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause())
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext())
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious())
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => TrackPlayer.seekTo(position))
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop())
}
