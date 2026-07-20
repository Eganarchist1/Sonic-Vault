import * as SecureStore from 'expo-secure-store'
import { RemotePlaylist, RemoteTrack } from '../sync/SyncManager'

export class YouTubeExtractor {
  private static async getExtractedCookies(): Promise<string> {
    const cookies = await SecureStore.getItemAsync('RES_YOUTUBE_EXTRACTED_COOKIE')
    if (!cookies) throw new Error('No YouTube Music cookies found. User needs to login via WebView.')
    return cookies
  }

  /**
   * Scrapes a YouTube Music playlist by pretending to be the browser.
   */
  static async getPlaylist(playlistId: string): Promise<RemotePlaylist> {
    const cookies = await this.getExtractedCookies()
    
    const response = await fetch(`https://music.youtube.com/playlist?list=${playlistId}`, {
      headers: {
        'Cookie': cookies,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    if (!response.ok) {
      throw new Error(`YouTube Extractor Error: ${response.status}`)
    }

    const html = await response.text()
    
    // Robust DOM scraping for the internal JSON state
    let ytDataString = '';
    
    // Format 1: var initialData = JSON.parse('...'); (Modern YouTube Music)
    const parseString = "var initialData = JSON.parse('";
    if (html.includes(parseString)) {
      const rawString = html.split(parseString)[1].split("');")[0];
      // Unescape hex \x22 and double backslashes
      const unescaped = rawString.replace(/\\x([0-9a-fA-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))).replace(/\\\\/g, '\\');
      ytDataString = unescaped;
    }
    // Format 2: ytInitialData = {...};
    else if (html.includes('ytInitialData = ')) {
      const parts = html.split('ytInitialData = ');
      if (parts.length > 1) {
        ytDataString = parts[1].split(';</script>')[0];
      }
    }
    // Format 3: window["ytInitialData"] = {...};
    else if (html.includes('window["ytInitialData"] = ')) {
      const parts = html.split('window["ytInitialData"] = ');
      if (parts.length > 1) {
        ytDataString = parts[1].split(';</script>')[0];
      }
    }

    if (!ytDataString) {
      const snippet = html.substring(0, 300).replace(/\s+/g, ' ');
      throw new Error(`YouTube Parse Error. HTML snippet: ${snippet}`);
    }

    let ytData;
    try {
      ytData = JSON.parse(ytDataString);
    } catch (e) {
      throw new Error(`Failed to parse YouTube JSON. HTML snippet: ${html.substring(0, 300).replace(/\s+/g, ' ')}`);
    }
    
    // Note: Parsing ytInitialData requires complex traversal.
    // This is a stub showing where the parsed mapping would occur.
    const tracks: RemoteTrack[] = []
    
    // Extract playlist name
    const playlistName = "Scraped YouTube Playlist" // ytData.header.musicPlaylistHeaderRenderer.title.runs[0].text

    return {
      remoteId: playlistId,
      source: 'youtube',
      name: playlistName,
      tracks
    }
  }
}
