import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NOTIFICATION_CHANNEL_ID, COLORS } from '../utils/constants';
import { formatDuration } from '../utils/formatters';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const TIMER_NOTIFICATION_ID = 'timer-notification';

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Timer Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: COLORS.primary,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        showBadge: true,
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Show a persistent timer notification
 */
export async function showTimerNotification(
  clientName: string,
  elapsedSeconds: number
): Promise<void> {
  try {
    const durationText = formatDuration(elapsedSeconds);

    await Notifications.scheduleNotificationAsync({
      identifier: TIMER_NOTIFICATION_ID,
      content: {
        title: 'Timer Running',
        body: `${clientName}: ${durationText}`,
        data: { type: 'timer' },
        sticky: true,
        autoDismiss: false,
        ...(Platform.OS === 'android' && {
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'timer',
        }),
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('Error showing timer notification:', error);
  }
}

/**
 * Update the timer notification with new elapsed time
 */
export async function updateTimerNotification(
  clientName: string,
  elapsedSeconds: number
): Promise<void> {
  // Same as show - it will replace the existing notification with same ID
  await showTimerNotification(clientName, elapsedSeconds);
}

/**
 * Dismiss the timer notification
 */
export async function dismissTimerNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(TIMER_NOTIFICATION_ID);
  } catch (error) {
    console.error('Error dismissing timer notification:', error);
  }
}

/**
 * Dismiss all notifications
 */
export async function dismissAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error dismissing all notifications:', error);
  }
}

/**
 * Schedule a reminder notification
 */
export async function scheduleReminderNotification(
  title: string,
  body: string,
  triggerSeconds: number
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        seconds: triggerSeconds,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      },
    });
    return id;
  } catch (error) {
    console.error('Error scheduling reminder notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(
  notificationId: string
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Add notification response listener
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}
