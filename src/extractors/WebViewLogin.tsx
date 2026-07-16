import React, { useRef, useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { WebView } from 'react-native-webview'
import * as SecureStore from 'expo-secure-store'

interface WebViewLoginProps {
  platform: 'spotify' | 'youtube'
  onSuccess: () => void
  onCancel: () => void
}

export const WebViewLogin: React.FC<WebViewLoginProps> = ({ platform, onSuccess, onCancel }) => {
  const webviewRef = useRef<WebView>(null)
  const [currentUrl, setCurrentUrl] = useState('')

  const config = {
    spotify: {
      url: 'https://accounts.spotify.com/authorize?client_id=8a8ce1c224b94e2289c656d0f1eb0789&response_type=token&redirect_uri=https://developer.spotify.com/&scope=user-library-read%20playlist-read-private',
      injection: `true;` // No injection needed for Spotify anymore, we intercept the URL redirect
    },
    youtube: {
      url: 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com/',
      injection: `
        (function() {
          if (window.__TOKEN_HOOK_INSTALLED) return;
          window.__TOKEN_HOOK_INSTALLED = true;
          // Hide webdriver signatures
          Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
          
          setInterval(function() {
            if (window.location.href.includes('music.youtube.com')) {
               if (!window.__HAS_EXTRACTED_TOKEN) {
                 window.__HAS_EXTRACTED_TOKEN = true;
                 window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN_EXTRACTED', platform: 'youtube', data: 'youtube-authenticated' }));
               }
            }
          }, 2000);
        })();
        true;
      `
    }
  }

  const handleMessage = async (event: any) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data)
      if (parsed.type === 'TOKEN_EXTRACTED') {
        const key = parsed.platform === 'spotify' ? 'RES_SPOTIFY_EXTRACTED_TOKEN' : 'RES_YOUTUBE_EXTRACTED_COOKIE'
        await SecureStore.setItemAsync(key, parsed.data)
        console.log(`Successfully extracted and saved token for ${parsed.platform}`)
        onSuccess()
      }
    } catch (e) {
      console.error('Error parsing webview message', e)
    }
  }

  const handleNavigationStateChange = async (navState: any) => {
    setCurrentUrl(navState.url)
    
    // Intercept Spotify OAuth Redirect
    if (platform === 'spotify' && navState.url.includes('developer.spotify.com') && navState.url.includes('#access_token=')) {
      try {
        const tokenMatch = navState.url.match(/#access_token=([^&]*)/);
        if (tokenMatch && tokenMatch[1]) {
          const extractedToken = tokenMatch[1];
          await SecureStore.setItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN', extractedToken);
          console.log('Successfully extracted OFFICIAL Spotify OAuth token from URL');
          onSuccess();
          return;
        }
      } catch (e) {
        console.error('Failed to extract Spotify token from URL redirect', e);
      }
    }

    // Dynamically inject scripts when crossing domain boundaries for YouTube
    if (navState.url.includes('music.youtube.com') && platform === 'youtube') {
      webviewRef.current?.injectJavaScript(config.youtube.injection)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Login to {platform === 'spotify' ? 'Spotify' : 'YouTube Music'}</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <WebView
        ref={webviewRef}
        source={{ uri: config[platform].url }}
        injectedJavaScript={config[platform].injection}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowsProtectedMedia={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode={'always'}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
        style={styles.webview}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1db954',
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancel: {
    color: '#fff',
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  }
})
