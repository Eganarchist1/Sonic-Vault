import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { DashboardScreen } from '../screens/DashboardScreen'
import { colors } from '../theme/colors'

const Stack = createNativeStackNavigator()

export const AppNavigator = () => {
  return (
    <NavigationContainer theme={{
      dark: true,
      colors: {
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        notification: colors.accent,
      }
    }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
