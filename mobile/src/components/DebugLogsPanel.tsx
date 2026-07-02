import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSyncContext } from '../context/SyncContext';
import { Feather } from '@expo/vector-icons';

export default function DebugLogsPanel() {
  const { state: { logs, pendingCount }, dispatch } = useSyncContext();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClear = () => {
    dispatch({ type: 'CLEAR_SYNC_LOGS' });
  };

  const getLogStyle = (type: string) => {
    switch (type) {
      case 'success':
        return { text: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'warn':
        return { text: 'text-amber-600', bg: 'bg-amber-50' };
      case 'conflict':
        return { text: 'text-indigo-600', bg: 'bg-indigo-50 font-semibold' };
      case 'info':
      default:
        return { text: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  return (
    <View className="bg-white border-t border-gray-200 shadow-lg">
      {/* Header bar */}
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.9}
        className="flex-row items-center justify-between px-6 py-2.5 bg-gray-50 border-t border-gray-100"
      >
        <View className="flex-row items-center">
          <View
            className={`w-2 h-2 rounded-full mr-2 ${
              pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
          <Text className="text-xs font-bold text-gray-500">Sync & Conflict Logs</Text>
          <View className="bg-gray-200/70 px-1.5 py-0.5 rounded ml-2">
            <Text className="text-[9px] font-bold text-gray-500">
              {pendingCount} pending
            </Text>
          </View>
        </View>
        <Feather name={isExpanded ? 'chevron-down' : 'chevron-up'} size={14} color="#6b7280" />
      </TouchableOpacity>

      {/* Expanded Logs Content */}
      {isExpanded && (
        <View className="h-[250px] px-6 pb-6 bg-white">
          <View className="flex-row items-center justify-between border-b border-gray-100 py-3 mb-3">
            <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Real-time Logs (LWW Engine)
            </Text>
            {logs.length > 0 && (
              <TouchableOpacity onPress={handleClear} className="flex-row items-center">
                <Feather name="trash" size={12} color="#9ca3af" />
                <Text className="text-xs font-semibold text-gray-400 ml-1">Clear Logs</Text>
              </TouchableOpacity>
            )}
          </View>

          {logs.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm text-gray-400">No events logged yet.</Text>
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
            >
              {logs.map(log => {
                const style = getLogStyle(log.type);
                return (
                  <View
                    key={log.id}
                    className={`flex-row items-start mb-2 p-2.5 rounded-xl ${style.bg}`}
                  >
                    <Text className="text-[10px] text-gray-400 font-bold mr-2 mt-0.5 w-[55px]">
                      {log.timestamp}
                    </Text>
                    <Text className={`flex-1 text-xs leading-relaxed ${style.text}`}>
                      {log.message}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}
