import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { setupPlayer } from './src/player/PlayerSetup';
import { colors } from './src/theme/colors';

export default function App() {
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    async function init() {
      const isSetup = await setupPlayer();
      setIsPlayerReady(isSetup);
    }
    init();
  }, []);

  if (!isPlayerReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AppNavigator />;
}
