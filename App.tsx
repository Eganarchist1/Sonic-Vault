import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { setupPlayer } from './src/player/PlayerSetup';
import { colors } from './src/theme/colors';

export default function App() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const isSetup = await setupPlayer();
        setIsPlayerReady(isSetup);
      } catch (e) {
        setSetupError(e instanceof Error ? e.message : String(e));
      }
    }
    init();
  }, []);

  if (setupError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ActivityIndicator size="large" color="red" />
        <View style={{ marginTop: 20 }}>
          <Text style={{ color: 'red', textAlign: 'center' }}>{setupError}</Text>
        </View>
      </View>
    );
  }

  if (!isPlayerReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AppNavigator />;
}
