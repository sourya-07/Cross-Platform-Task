import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import { useSyncContext } from '../context/SyncContext';
import { Feather } from '@expo/vector-icons';

export default function GlobalBanner() {
  const { state: { isOnline } } = useSyncContext();
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!isOnline) {
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Show online banner temporarily on transition, then fade out
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Wait 3 seconds, then fade out
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => setVisible(false));
        }, 3000);
      });
    }
  }, [isOnline]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{ opacity: fadeAnim }}
      className={`w-full flex-row items-center justify-center py-2.5 px-4 ${
        isOnline ? 'bg-emerald-50 border-b border-emerald-200' : 'bg-amber-50 border-b border-amber-200'
      }`}
    >
      <Feather
        name={isOnline ? 'wifi' : 'wifi-off'}
        size={16}
        color={isOnline ? '#059669' : '#d97706'}
      />
      <Text
        className={`ml-2 text-xs font-semibold ${
          isOnline ? 'text-emerald-800' : 'text-amber-800'
        }`}
      >
        {isOnline
          ? 'Network online. Tasks are fully synchronized.'
          : 'Offline Mode. Changes will sync once connection is restored.'}
      </Text>
    </Animated.View>
  );
}
