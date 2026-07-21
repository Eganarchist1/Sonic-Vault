import * as Crypto from 'expo-crypto';

export class YouTubeExtractor {
  static async getPlaylist(playlistId: string, cookies: string): Promise<any> {
    const sapisidMatch = cookies.match(/SAPISID=([^;]+)/);
    if (!sapisidMatch) throw new Error("No SAPISID cookie found for YouTube.");
    const sapisid = sapisidMatch[1];
    
    const time = Math.floor(Date.now() / 1000);
    const str = `${time} ${sapisid} https://music.youtube.com`;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, str);
    const authHeader = `SAPISIDHASH ${time}_${hash}`;

    const payload = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20230522.01.00",
          hl: "en",
        }
      },
      browseId: "FEmusic_liked_videos"
    };

    const response = await fetch('https://music.youtube.com/youtubei/v1/browse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Origin': 'https://music.youtube.com',
        'Cookie': cookies
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`YouTube API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Parse the innerTube API response
    const tracks: any[] = [];
    try {
      // The liked music list is usually inside a TwoColumnBrowseResultsRenderer or SingleColumnBrowseResultsRenderer
      const tabs = data.contents?.singleColumnBrowseResultsRenderer?.tabs || data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const playlistContents = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents[0]?.musicPlaylistShelfRenderer?.contents || [];

      playlistContents.forEach((item: any) => {
        const renderer = item.musicResponsiveListItemRenderer;
        if (renderer) {
          const title = renderer.flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0]?.text;
          const artist = renderer.flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs[0]?.text;
          const remoteId = renderer.playlistItemData?.videoId;
          
          if (title && remoteId) {
            tracks.push({
              remoteId,
              source: 'youtube',
              title,
              artist: artist || 'Unknown Artist',
              artworkUrl: renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails[0]?.url,
              duration: 0 // Duration parsing omitted for brevity
            });
          }
        }
      });
    } catch (e) {
      console.error("YouTube JSON parsing error", e);
      throw new Error("Failed to parse YouTube JSON. The API structure may have changed.");
    }

    return {
      remoteId: 'LM',
      source: 'youtube',
      name: 'Liked Music',
      tracks
    };
  }
}
