import * as SecureStore from 'expo-secure-store'
import { RemotePlaylist, RemoteTrack } from '../sync/SyncManager'

export class SpotifyExtractor {
  private static async getExtractedToken(): Promise<string> {
    const token = await SecureStore.getItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN')
    if (!token) throw new Error('No Spotify web token found. User needs to login via WebView.')
    return token
  }

  /**
   * Fetches the user's Liked Songs using the internal web API structure.
   */
  static async getLikedSongs(): Promise<RemotePlaylist> {
    const spDcCookie = await this.getExtractedToken()
    
    // First, fetch a fresh Web Player access token using the sp_dc cookie
    const tokenResponse = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
      headers: {
        'Cookie': `sp_dc=${spDcCookie}`
      }
    });

    if (!tokenResponse.ok) {
      throw new Error(`Failed to fetch internal Web Player token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.accessToken;
    
    // Internal Spotify Web APIs often use standard Bearer auth but different endpoints or standard ones 
    // if the token is valid for open.spotify.com
    const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text();
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
