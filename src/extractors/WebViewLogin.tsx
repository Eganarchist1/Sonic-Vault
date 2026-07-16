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
      injection: `
        (function() {
          if (window.__TOKEN_HOOK_INSTALLED) return;
          window.__TOKEN_HOOK_INSTALLED = true;
          
          // Intercept XHR
          var XHR = XMLHttpRequest.prototype;
          var open = XHR.open;
          var send = XHR.send;
          var setRequestHeader = XHR.setRequestHeader;
          
          XHR.setRequestHeader = function(header, value) {
            if (header.toLowerCase() === 'authorization' && value.includes('Bearer ')) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN_EXTRACTED', platform: 'spotify', data: value.replace('Bearer ', '') }));
            }
            return setRequestHeader.apply(this, arguments);
          };
          
          // Intercept Fetch
          var originalFetch = window.fetch;
          window.fetch = function() {
            var args = arguments;
            if (args[1] && args[1].headers) {
              var headers = new Headers(args[1].headers);
              var auth = headers.get('authorization') || headers.get('Authorization');
              if (auth && auth.includes('Bearer ')) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN_EXTRACTED', platform: 'spotify', data: auth.replace('Bearer ', '') }));
              }
            }
            return originalFetch.apply(this, args);
          };
          
          // Fallback session tag
          setInterval(function() {
            try {
              var s = document.getElementById('session');
              if (s && s.innerHTML) {
                var d = JSON.parse(s.innerHTML);
                if (d.accessToken) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN_EXTRACTED', platform: 'spotify', data: d.accessToken }));
              }
            } catch(e){}
          }, 2000);
        })();
        true;
      `
    },
    youtube: {
      url: 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com/',
      injection: `
        (function() {
          // Attempt to extract cookies or wait for successful redirect
          setInterval(function() {
            if (window.location.href.includes('music.youtube.com')) {
               window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TOKEN_EXTRACTED', platform: 'youtube', data: 'youtube-authenticated' }));
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

  const handleNavigationStateChange = (navState: any) => {
    setCurrentUrl(navState.url)
    // Dynamically inject scripts when crossing domain boundaries
    if (navState.url.includes('open.spotify.com') && platform === 'spotify') {
      webviewRef.current?.injectJavaScript(config.spotify.injection)
    }
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
        userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0"
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
