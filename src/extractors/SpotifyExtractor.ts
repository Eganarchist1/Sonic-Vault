import * as SecureStore from 'expo-secure-store'
import { RemotePlaylist, RemoteTrack } from '../sync/SyncManager'

export class SpotifyExtractor {
  private static async getExtractedToken(): Promise<string> {
    try {
      // 1. Try to get a fresh token using the shared cookie jar (the most reliable method)
      const res = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.accessToken) {
          return data.accessToken;
        }
      }
    } catch (e) {
      console.log('Failed to fetch fresh token via cookies', e);
    }

    // 2. Fallback to the token intercepted by WebViewLogin
    const token = await SecureStore.getItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN')
    if (!token) throw new Error('No Spotify web token found. User needs to login via WebView.')
    return token
  }

  /**
   * Fetches the user's Liked Songs using the internal web API structure.
   */
  static async getLikedSongs(): Promise<RemotePlaylist> {
    const token = await this.getExtractedToken()
    
    // Instead of forcing the standard Web API which triggers 429 WAF blocks,
    // we use the exact spclient endpoint or the standard API with minimal tracking.
    const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'App-Platform': 'WebPlayer',
        'Origin': 'https://open.spotify.com',
        'Referer': 'https://open.spotify.com/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site'
      }
    })

    if (!response.ok) {
      const errorText = await response.text();
      // If 429 or 403, we need to inform the user it might be a WAF block
      throw new Error(`Spotify Extractor Error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    
    const tracks: RemoteTrack[] = data.items.map((item: any) => ({
      remoteId: item.track.uri,
      source: 'spotify',
      title: item.track.name,
      artist: item.track.artists.map((a: any) => a.name).join(', '),
      artworkUrl: item.track.album.images[0]?.url,
      duration: item.track.duration_ms / 1000,
    }))

    return {
      remoteId: 'spotify-liked-songs',
      source: 'spotify',
      name: 'Liked Songs',
      tracks
    }
  }
}
