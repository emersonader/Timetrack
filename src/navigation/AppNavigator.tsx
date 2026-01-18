import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { COLORS, FONT_SIZES } from '../utils/constants';
import { useTheme } from '../context/ThemeContext';

// Screens
import { MainScreen } from '../screens/MainScreen';
import { ChooseClientScreen } from '../screens/ChooseClientScreen';
import { AddClientScreen } from '../screens/AddClientScreen';
import { EditClientScreen } from '../screens/EditClientScreen';
import { ClientDetailsScreen } from '../screens/ClientDetailsScreen';
import { EditSessionScreen } from '../screens/EditSessionScreen';
import { SendInvoiceScreen } from '../screens/SendInvoiceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PaywallScreen } from '../screens/PaywallScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
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
        initialRouteName="Main"
        screenOptions={screenOptions}
      >
        <Stack.Screen
          name="Main"
          component={MainScreen}
          options={({ navigation }) => ({
            title: 'Job Time Tracker',
            headerLeft: () => null,
            headerBackVisible: false,
            gestureEnabled: false,
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ marginLeft: 16 }}>
                <Ionicons name="settings-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
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
