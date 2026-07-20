import * as SecureStore from 'expo-secure-store'
import { RemotePlaylist, RemoteTrack } from '../sync/SyncManager'

export class SpotifyExtractor {
  private static async getExtractedToken(): Promise<{ token: string, clientToken: string }> {
    const rawToken = await SecureStore.getItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN')
    if (!rawToken) throw new Error('No Spotify web token found. User needs to login via WebView.')
    
    // The new interceptor saves it as "token|clientToken"
    if (rawToken.includes('|')) {
      const parts = rawToken.split('|');
      return { token: parts[0], clientToken: parts[1] };
    }
    return { token: rawToken, clientToken: '' };
  }

  /**
   * Fetches the user's Liked Songs using the internal web API structure.
   */
  static async getLikedSongs(): Promise<RemotePlaylist> {
    const { token, clientToken } = await this.getExtractedToken()
    
    const headers: any = {
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
    };

    if (clientToken) {
      headers['client-token'] = clientToken;
    }

    const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', { headers })

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
