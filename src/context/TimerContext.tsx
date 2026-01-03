import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { TimerState, Client, TimeSession } from '../types';
import {
  startSession,
  stopSession,
  getActiveTimer,
  getActiveSession,
} from '../db/sessionRepository';
import { getClientById } from '../db/clientRepository';
import {
  showTimerNotification,
  updateTimerNotification,
  dismissTimerNotification,
  requestNotificationPermissions,
} from '../services/notificationService';
import { checkForActiveTimer, getElapsedTime } from '../services/timerPersistence';
import { TIMER_UPDATE_INTERVAL } from '../utils/constants';
import { formatFullName } from '../utils/formatters';

interface TimerContextValue {
  timerState: TimerState;
  activeClient: Client | null;
  startTimer: (clientId: number) => Promise<void>;
  stopTimer: (notes?: string) => Promise<TimeSession | null>;
  isLoading: boolean;
  error: string | null;
}

const initialTimerState: TimerState = {
  isRunning: false,
  isPaused: false,
  clientId: null,
  sessionId: null,
  startTime: null,
  elapsedSeconds: 0,
};

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

interface TimerProviderProps {
  children: ReactNode;
}

export function TimerProvider({ children }: TimerProviderProps) {
  const [timerState, setTimerState] = useState<TimerState>(initialTimerState);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notificationUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (timerState.isRunning && timerState.startTime) {
      intervalRef.current = setInterval(() => {
        setTimerState((prev) => ({
          ...prev,
          elapsedSeconds: getElapsedTime(prev.startTime!),
        }));
      }, TIMER_UPDATE_INTERVAL);

      // Update notification every minute
      notificationUpdateRef.current = setInterval(() => {
        if (activeClient) {
          const clientName = formatFullName(
            activeClient.first_name,
            activeClient.last_name
          );
          updateTimerNotification(clientName, timerState.elapsedSeconds);
        }
      }, 60000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (notificationUpdateRef.current) {
          clearInterval(notificationUpdateRef.current);
        }
      };
    }
  }, [timerState.isRunning, timerState.startTime, activeClient]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground - recalculate elapsed time
        if (timerState.isRunning && timerState.startTime) {
          setTimerState((prev) => ({
            ...prev,
            elapsedSeconds: getElapsedTime(prev.startTime!),
          }));
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [timerState.isRunning, timerState.startTime]);

  // Check for active timer on mount
  useEffect(() => {
    const initializeTimer = async () => {
      try {
        await requestNotificationPermissions();

        const recoveryState = await checkForActiveTimer();

        if (recoveryState.hasActiveTimer && recoveryState.activeSession) {
          const client = await getClientById(
            recoveryState.activeSession.client_id
          );

          if (client) {
            setActiveClient(client);
            setTimerState({
              isRunning: true,
              isPaused: false,
              clientId: client.id,
              sessionId: recoveryState.activeSession.id,
              startTime: new Date(recoveryState.activeSession.start_time),
              elapsedSeconds: recoveryState.elapsedSeconds,
            });

            // Show notification for recovered timer
            const clientName = formatFullName(
              client.first_name,
              client.last_name
            );
            await showTimerNotification(clientName, recoveryState.elapsedSeconds);
          }
        }
      } catch (err) {
        console.error('Error initializing timer:', err);
        setError('Failed to initialize timer');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTimer();
  }, []);

  const startTimer = useCallback(async (clientId: number) => {
    try {
      setError(null);

      // Get client info
      const client = await getClientById(clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Start the session
      const session = await startSession(clientId);

      setActiveClient(client);
      setTimerState({
        isRunning: true,
        isPaused: false,
        clientId,
        sessionId: session.id,
        startTime: new Date(session.start_time),
        elapsedSeconds: 0,
      });

      // Show notification
      const clientName = formatFullName(client.first_name, client.last_name);
      await showTimerNotification(clientName, 0);
    } catch (err) {
      console.error('Error starting timer:', err);
      setError('Failed to start timer');
      throw err;
    }
  }, []);

  const stopTimer = useCallback(async (notes?: string): Promise<TimeSession | null> => {
    try {
      setError(null);

      if (!timerState.sessionId) {
        return null;
      }

      // Stop the session with optional notes
      const session = await stopSession(timerState.sessionId, notes);

      // Clear timer state
      setTimerState(initialTimerState);
      setActiveClient(null);

      // Dismiss notification
      await dismissTimerNotification();

      return session;
    } catch (err) {
      console.error('Error stopping timer:', err);
      setError('Failed to stop timer');
      throw err;
    }
  }, [timerState.sessionId]);

  const value: TimerContextValue = {
    timerState,
    activeClient,
    startTimer,
    stopTimer,
    isLoading,
    error,
  };

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
