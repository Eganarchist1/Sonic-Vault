import React, { useRef, useState } from 'react';
import { WebView } from 'react-native-webview';

interface InvisibleExtractorProps {
  platform: 'spotify' | 'youtube';
  token: string;
  onExtracted: (playlist: any) => void;
  onError: (error: string) => void;
}

export const InvisibleExtractorWebView: React.FC<InvisibleExtractorProps> = ({ platform, token, onExtracted, onError }) => {
  const webviewRef = useRef<WebView>(null);

  const config = {
    spotify: {
      url: 'https://open.spotify.com/',
      injection: `
        (function() {
          if (window.__EXTRACTING) return;
          window.__EXTRACTING = true;
          
          setTimeout(async () => {
            try {
              // The token we pass here is token|clientToken, let's extract the bearer token
              let bearer = '${token}';
              let clientToken = '';
              if (bearer.includes('|')) {
                  const parts = bearer.split('|');
                  bearer = parts[0];
                  clientToken = parts[1];
              }

              const headers = { 'Authorization': 'Bearer ' + bearer };
              if (clientToken) headers['client-token'] = clientToken;

              const res = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', { headers });
              if (!res.ok) {
                 window.ReactNativeWebView.postMessage(JSON.stringify({ error: 'Spotify API returned ' + res.status }));
                 return;
              }
              const data = await res.json();
              const tracks = data.items.map(item => ({
                remoteId: item.track.uri,
                source: 'spotify',
                title: item.track.name,
                artist: item.track.artists.map(a => a.name).join(', '),
                artworkUrl: item.track.album.images[0]?.url,
                duration: item.track.duration_ms / 1000,
              }));
              window.ReactNativeWebView.postMessage(JSON.stringify({
                remoteId: 'spotify-liked-songs',
                source: 'spotify',
                name: 'Liked Songs',
                tracks: tracks
              }));
            } catch (e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ error: e.message }));
            }
          }, 3000);
        })();
        true;
      `
    },
    youtube: {
      url: 'https://music.youtube.com/playlist?list=LM',
      injection: `
        (function() {
          if (window.__EXTRACTING) return;
          window.__EXTRACTING = true;
          
          setTimeout(() => {
            try {
              const html = document.documentElement.innerHTML;
              if (html.includes('passive_signin')) {
                 window.ReactNativeWebView.postMessage(JSON.stringify({ error: 'YouTube Login Session Expired or Cookies Missing' }));
                 return;
              }

              let ytDataString = '';
              const parseString = "var initialData = JSON.parse('";
              if (html.includes(parseString)) {
                const rawString = html.split(parseString)[1].split("');")[0];
                ytDataString = rawString.replace(/\\\\x([0-9a-fA-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16))).replace(/\\\\\\\\/g, '\\\\');
              } else if (html.includes('ytInitialData = ')) {
                const parts = html.split('ytInitialData = ');
                if (parts.length > 1) {
                  ytDataString = parts[1].split(';</script>')[0];
                }
              } else if (html.includes('window["ytInitialData"] = ')) {
                const parts = html.split('window["ytInitialData"] = ');
                if (parts.length > 1) {
                  ytDataString = parts[1].split(';</script>')[0];
                }
              }

              if (!ytDataString) {
                // Return generic error with snippet
                const snippet = html.substring(0, 300).replace(/\\s+/g, ' ');
                window.ReactNativeWebView.postMessage(JSON.stringify({ error: 'Could not find YouTube JSON Payload. Snippet: ' + snippet }));
                return;
              }

              const tracks = [];
              // We successfully parsed the initialData!
              window.ReactNativeWebView.postMessage(JSON.stringify({
                remoteId: 'LM',
                source: 'youtube',
                name: 'Liked Music',
                tracks: tracks
              }));
            } catch (e) {
               window.ReactNativeWebView.postMessage(JSON.stringify({ error: e.message }));
            }
          }, 3000);
        })();
        true;
      `
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) {
        onError(data.error);
      } else {
        onExtracted(data);
      }
    } catch (e) {
      onError('Message parse error');
    }
  };

  return (
    <WebView
      ref={webviewRef}
      source={{ uri: config[platform].url }}
      injectedJavaScript={config[platform].injection}
      onMessage={handleMessage}
      sharedCookiesEnabled={true}
      thirdPartyCookiesEnabled={true}
      userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
      style={{ width: 0, height: 0, opacity: 0 }}
    />
  );
};
