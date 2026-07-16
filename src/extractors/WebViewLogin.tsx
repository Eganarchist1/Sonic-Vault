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
      url: 'https://accounts.spotify.com/en/login?continue=https://open.spotify.com/',
      // Injects a script to look for the access token in Spotify's local storage or DOM
      injection: `
        setInterval(function() {
          try {
            // Spotify stores access tokens in localStorage sometimes, or we can look for session data
            let tokenData = localStorage.getItem('wp-access-token') || localStorage.getItem('sp_dc');
            if (tokenData) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN_EXTRACTED', platform: 'spotify', data: tokenData }));
            }
          } catch (e) {}
        }, 2000);
        true;
      `
    },
    youtube: {
      url: 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com/',
      // Injects a script to grab the SAPISID cookie or YouTube Music's specific token config
      injection: `
        setInterval(function() {
          try {
            if (window.location.href.includes('music.youtube.com')) {
              // Extract cookies which contain the auth state for yt music
              let cookies = document.cookie;
              if (cookies.includes('SAPISID') && cookies.includes('LOGIN_INFO')) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN_EXTRACTED', platform: 'youtube', data: cookies }));
              }
            }
          } catch (e) {}
        }, 2000);
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
        onNavigationStateChange={(navState) => setCurrentUrl(navState.url)}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowsProtectedMedia={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode={'always'}
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
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
