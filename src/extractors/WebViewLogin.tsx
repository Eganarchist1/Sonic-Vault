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
  const config = {
    spotify: {
      url: 'https://accounts.spotify.com/login?continue=https%3A%2F%2Fopen.spotify.com%2F',
      injection: `
        (function() {
          if (window.__TOKEN_HOOK_INSTALLED) return;
          window.__TOKEN_HOOK_INSTALLED = true;
          
          let capturedAuth = '';
          let capturedClient = '';

          function checkAndSend() {
             if (capturedAuth && capturedClient && !window.__HAS_EXTRACTED_TOKEN) {
                 window.__HAS_EXTRACTED_TOKEN = true;
                 window.ReactNativeWebView.postMessage(JSON.stringify({
                   type: 'TOKEN_EXTRACTED',
                   platform: 'spotify',
                   data: capturedAuth.replace('Bearer ', '') + '|' + capturedClient
                 }));
             }
          }

          const originalFetch = window.fetch;
          window.fetch = async function(...args) {
             const url = args[0];
             const options = args[1];
             if (options && options.headers && (typeof url === 'string' && (url.includes('api.spotify.com') || url.includes('spclient.wg.spotify.com')))) {
                 if (options.headers instanceof Headers) {
                     capturedAuth = options.headers.get('authorization') || options.headers.get('Authorization') || capturedAuth;
                     capturedClient = options.headers.get('client-token') || options.headers.get('Client-Token') || capturedClient;
                 } else {
                     capturedAuth = options.headers['authorization'] || options.headers['Authorization'] || capturedAuth;
                     capturedClient = options.headers['client-token'] || options.headers['Client-Token'] || capturedClient;
                 }
                 checkAndSend();
             }
             return originalFetch.apply(this, args);
          };

          const originalXHR = window.XMLHttpRequest.prototype.open;
          window.XMLHttpRequest.prototype.open = function(method, url) {
              this._url = url;
              return originalXHR.apply(this, arguments);
          };
          const originalSetRequestHeader = window.XMLHttpRequest.prototype.setRequestHeader;
          window.XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
              if (header.toLowerCase() === 'authorization' && value.includes('Bearer ')) {
                  capturedAuth = value;
              }
              if (header.toLowerCase() === 'client-token') {
                  capturedClient = value;
              }
              checkAndSend();
              return originalSetRequestHeader.apply(this, arguments);
          };
        })();
        true;
      `
    },
    youtube: {
      url: 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com/',
      injection: `
        (function() {
          if (window.__TOKEN_HOOK_INSTALLED) return;
          window.__TOKEN_HOOK_INSTALLED = true;
          
          setInterval(() => {
            const cookies = document.cookie;
            // Only extract if we are actually on music.youtube.com AND have real auth cookies
            if (window.location.hostname.includes('music.youtube.com')) {
              if (cookies.includes('SAPISID=') || cookies.includes('__Secure-3PSID=')) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'TOKEN_EXTRACTED',
                  platform: 'youtube',
                  data: cookies
                }));
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
        const key = parsed.platform === 'spotify' 
          ? 'RES_SPOTIFY_EXTRACTED_TOKEN' 
          : 'RES_YOUTUBE_EXTRACTED_COOKIE'
        
        await SecureStore.setItemAsync(key, parsed.data)
        console.log(`Successfully extracted and saved token for ${parsed.platform}`)
        onSuccess()
      }
    } catch (e) {
      console.error('Error parsing webview message', e)
    }
  }

  const handleNavigationStateChange = async (navState: any) => {
    // Spotify interception is now handled purely by the injected JavaScript on open.spotify.com

    if (navState.url.includes('music.youtube.com') && platform === 'youtube') {
      webviewRef.current?.injectJavaScript(config.youtube.injection)
    }
    if (navState.url.includes('open.spotify.com') && platform === 'spotify') {
      webviewRef.current?.injectJavaScript(config.spotify.injection)
    }
  }

    // No loading screen needed anymore since we hardcoded the URL

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
