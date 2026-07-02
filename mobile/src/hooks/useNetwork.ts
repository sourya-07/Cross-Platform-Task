import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useSyncContext } from '../context/SyncContext';

export function useNetwork() {
  const { state: { isOnline }, dispatch } = useSyncContext();
  const prevIsConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const handleConnectivityChange = (state: any) => {
      const currentOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      
      // Only dispatch state updates when the network status actually changes
      if (currentOnline !== prevIsConnected.current) {
        prevIsConnected.current = currentOnline;
        dispatch({ type: 'SET_ONLINE', payload: currentOnline });
      }
    };

    // Subscribe to network connection state updates (triggers callback with current state on registration)
    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    // Check initial state
    NetInfo.fetch().then(handleConnectivityChange);

    return () => unsubscribe();
  }, [dispatch]);

  return { isOnline };
}

