import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
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
import { RecurringJobsScreen } from '../screens/RecurringJobsScreen';
import { ProjectTemplatesScreen } from '../screens/ProjectTemplatesScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { FleetScreen } from '../screens/FleetScreen';
import { GeofencesScreen } from '../screens/GeofencesScreen';
import { QRCodesScreen } from '../screens/QRCodesScreen';
import { ReceiptScannerScreen } from '../screens/ReceiptScannerScreen';
import { IntegrationsScreen } from '../screens/IntegrationsScreen';
import { ClientPortalScreen } from '../screens/ClientPortalScreen';
import { InvoiceDetailScreen } from '../screens/InvoiceDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

type AppNavigatorProps = {
  onboardingCompleted: boolean;
};

export function AppNavigator({ onboardingCompleted }: AppNavigatorProps) {
  const { primaryColor } = useTheme();
  const { t } = useTranslation();

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
            title: t('nav.hourflow'),
            headerLeft: () => null,
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ChooseClient"
          component={ChooseClientScreen}
          options={({ navigation }) => ({
            title: t('nav.chooseClient'),
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
            title: t('nav.addClient'),
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
            title: t('nav.editClient'),
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
            title: t('nav.clientDetails'),
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
            title: t('nav.editSession'),
          }}
        />
        <Stack.Screen
          name="SendInvoice"
          component={SendInvoiceScreen}
          options={({ navigation }) => ({
            title: t('nav.sendInvoice'),
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
            title: t('nav.invoiceHistory'),
            headerLeft: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Main')} style={{ marginRight: 16 }}>
                <Ionicons name="home-outline" size={24} color={COLORS.white} />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="InvoiceDetail"
          component={InvoiceDetailScreen}
          options={{
            title: t('nav.invoiceDetails'),
          }}
        />
        <Stack.Screen
          name="Reports"
          component={ReportsScreen}
          options={({ navigation }) => ({
            title: t('nav.reports'),
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
            title: t('nav.settings'),
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
          options={{ title: t('nav.export') }}
        />
        <Stack.Screen
          name="RecurringJobs"
          component={RecurringJobsScreen}
          options={{ title: t('nav.recurringJobs') }}
        />
        <Stack.Screen
          name="ProjectTemplates"
          component={ProjectTemplatesScreen}
          options={{ title: t('nav.projectTemplates') }}
        />
        <Stack.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{ title: t('nav.analytics') }}
        />
        <Stack.Screen
          name="Insights"
          component={InsightsScreen}
          options={{ title: t('nav.aiInsights') }}
        />
        <Stack.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{ title: t('nav.inventory') }}
        />
        <Stack.Screen
          name="Fleet"
          component={FleetScreen}
          options={{ title: t('nav.fleet') }}
        />
        <Stack.Screen
          name="QRCodes"
          component={QRCodesScreen}
          options={{ title: t('nav.qrCodes') }}
        />
        <Stack.Screen
          name="ReceiptScanner"
          component={ReceiptScannerScreen}
          options={{ title: t('nav.receiptScanner') }}
        />
        <Stack.Screen
          name="Integrations"
          component={IntegrationsScreen}
          options={{ title: t('nav.integrations') }}
        />
        <Stack.Screen
          name="ClientPortal"
          component={ClientPortalScreen}
          options={{ title: t('nav.clientPortal') }}
        />
        <Stack.Screen
          name="Geofences"
          component={GeofencesScreen}
          options={{ title: t('nav.geofences') }}
        />
        <Stack.Screen
          name="Legal"
          component={LegalScreen}
          options={({ route }) => ({
            title: route.params.type === 'privacy' ? t('nav.privacyPolicy') : t('nav.termsOfService'),
          })}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{
            title: t('nav.upgrade'),
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
