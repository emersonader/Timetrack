import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { COLORS, FONT_SIZES } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';

// Screens
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MainScreen } from '../screens/MainScreen';
import { ChooseClientScreen } from '../screens/ChooseClientScreen';
import { AddClientScreen } from '../screens/AddClientScreen';
import { EditClientScreen } from '../screens/EditClientScreen';
import { ClientDetailsScreen } from '../screens/ClientDetailsScreen';
import { EditSessionScreen } from '../screens/EditSessionScreen';
import { SendInvoiceScreen } from '../screens/SendInvoiceScreen';
import { InvoiceHistoryScreen } from '../screens/InvoiceHistoryScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { ExportScreen } from '../screens/ExportScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

type AppNavigatorProps = {
  onboardingCompleted: boolean;
};

export function AppNavigator({ onboardingCompleted }: AppNavigatorProps) {
  const { primaryColor } = useTheme();

  const screenOptions = {
    headerStyle: {
      backgroundColor: primaryColor,
    },
    headerTintColor: COLORS.white,
    headerTitleStyle: {
      fontWeight: '600' as const,
      fontSize: FONT_SIZES.lg,
    },
    headerBackTitleVisible: false,
    animation: 'slide_from_right' as const,
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={onboardingCompleted ? 'Main' : 'Onboarding'}
        screenOptions={screenOptions}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="Main"
          component={MainScreen}
          options={{
            title: 'HourFlow',
            headerLeft: () => null,
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ChooseClient"
          component={ChooseClientScreen}
          options={({ navigation }) => ({
            title: 'Choose a Client',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="AddClient"
          component={AddClientScreen}
          options={({ navigation }) => ({
            title: 'Add Client',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="EditClient"
          component={EditClientScreen}
          options={({ navigation }) => ({
            title: 'Edit Client',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="ClientDetails"
          component={ClientDetailsScreen}
          options={({ navigation }) => ({
            title: 'Client Details',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="EditSession"
          component={EditSessionScreen}
          options={{
            title: 'Edit Time Session',
          }}
        />
        <Stack.Screen
          name="SendInvoice"
          component={SendInvoiceScreen}
          options={({ navigation }) => ({
            title: 'Send Invoice',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="InvoiceHistory"
          component={InvoiceHistoryScreen}
          options={({ navigation }) => ({
            title: 'Invoice History',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={({ navigation }) => ({
            title: 'Reports',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={({ navigation }) => ({
            title: 'Settings',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Export"
          component={ExportScreen}
          options={({ navigation }) => ({
            title: 'Export & Backup',
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="Legal"
          component={LegalScreen}
          options={({ route }) => ({
            title: route.params.type === 'privacy' ? 'Privacy Policy' : 'Terms of Service',
          })}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{
            title: 'Upgrade',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
