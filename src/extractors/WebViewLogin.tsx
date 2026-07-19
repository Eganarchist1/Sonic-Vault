import React, { useRef, useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { WebView } from 'react-native-webview'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'

interface WebViewLoginProps {
  platform: 'spotify' | 'youtube'
  onSuccess: () => void
  onCancel: () => void
}

const CLIENT_ID = '11d0c6def52f48578a4082ff21deb13c'
const REDIRECT_URI = 'https://developer.spotify.com/'

const generateRandomString = (length: number) => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const base64urlencode = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const WebViewLogin: React.FC<WebViewLoginProps> = ({ platform, onSuccess, onCancel }) => {
  const webviewRef = useRef<WebView>(null)
  const [currentUrl, setCurrentUrl] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [codeVerifier, setCodeVerifier] = useState('')

  useEffect(() => {
    if (platform === 'spotify') {
      const initPKCE = async () => {
        const verifier = generateRandomString(128)
        setCodeVerifier(verifier)
        
        const hashed = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          verifier
        )
        // Expo Crypto returns hex, we need base64url for PKCE
        const hexToUint8Array = (hex: string) => {
          const arr = new Uint8Array(hex.length / 2)
          for (let i = 0; i < hex.length; i += 2) {
            arr[i / 2] = parseInt(hex.substring(i, i + 2), 16)
          }
          return arr
        }
        const challenge = base64urlencode(hexToUint8Array(hashed))

        const url = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge_method=S256&code_challenge=${challenge}&scope=user-library-read%20playlist-read-private`
        setSpotifyUrl(url)
      }
      initPKCE()
    }
  }, [platform])

  const config = {
    spotify: {
      url: spotifyUrl,
      injection: `true;`
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
    
    // Intercept Spotify PKCE Redirect
    if (platform === 'spotify' && navState.url.includes('developer.spotify.com') && navState.url.includes('code=')) {
      try {
        const codeMatch = navState.url.match(/[?&]code=([^&]*)/);
        if (codeMatch && codeMatch[1]) {
          const authCode = codeMatch[1];
          console.log('Intercepted Auth Code, exchanging for token...');
          
          const response = await fetch('https://accounts.spotify.com/api/token', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
             },
             body: new URLSearchParams({
               client_id: CLIENT_ID,
               grant_type: 'authorization_code',
               code: authCode,
               redirect_uri: REDIRECT_URI,
               code_verifier: codeVerifier,
             }).toString()
           });

           const tokenData = await response.json();

           if (tokenData.access_token) {
              await SecureStore.setItemAsync('RES_SPOTIFY_EXTRACTED_TOKEN', tokenData.access_token);
              console.log('Successfully extracted OFFICIAL Spotify PKCE OAuth token');
              onSuccess();
           } else {
              console.error('Failed to exchange PKCE code for token', tokenData)
           }
          return;
        }
      } catch (e) {
        console.error('Failed to extract Spotify token from URL redirect', e);
      }
    }

    if (navState.url.includes('music.youtube.com') && platform === 'youtube') {
      webviewRef.current?.injectJavaScript(config.youtube.injection)
    }
  }

  if (platform === 'spotify' && !spotifyUrl) {
    return <View style={styles.container} />
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
