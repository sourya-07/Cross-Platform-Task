import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Task, SyncStatus } from '../types';
import { Feather } from '@expo/vector-icons';

interface TaskCardProps {
  task: Task;
  syncStatus: SyncStatus;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function TaskCard({ task, syncStatus, onToggle, onEdit, onDelete }: TaskCardProps) {
  const handleDeletePress = () => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: onDelete, style: 'destructive' },
      ],
      { cancelable: true }
    );
  };

  // Helper to format date cleanly
  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Determine badge styles based on sync state
  const getSyncBadgeStyles = () => {
    switch (syncStatus) {
      case 'pending':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          dot: 'bg-amber-500',
          label: 'Pending Sync',
        };
      case 'conflict_resolved':
        return {
          bg: 'bg-indigo-50',
          text: 'text-indigo-700',
          dot: 'bg-indigo-500',
          label: 'Resolved',
        };
      case 'synced':
      default:
        return {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          dot: 'bg-emerald-500',
          label: 'Synced',
        };
    }
  };

  const badge = getSyncBadgeStyles();

  return (
    <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-3 shadow-sm flex-row items-start justify-between">
      <View className="flex-1 flex-row items-start mr-3">
        {/* Toggle Checkbox */}
        <TouchableOpacity
          onPress={onToggle}
          activeOpacity={0.7}
          className="mt-0.5 mr-3"
        >
          <View
            className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${
              task.is_completed
                ? 'bg-emerald-500 border-emerald-500'
                : 'border-gray-300 bg-white'
            }`}
          >
            {task.is_completed && (
              <Feather name="check" size={14} color="#ffffff" strokeWidth={3} />
            )}
          </View>
        </TouchableOpacity>

        {/* Task Info */}
        <TouchableOpacity
          onPress={onEdit}
          activeOpacity={0.8}
          className="flex-1"
        >
          <Text
            className={`text-base font-semibold text-gray-800 ${
              task.is_completed ? 'line-through text-gray-400' : ''
            }`}
          >
            {task.title}
          </Text>

          {task.description ? (
            <Text
              numberOfLines={2}
              className={`text-sm text-gray-500 mt-1 leading-relaxed ${
                task.is_completed ? 'line-through text-gray-300' : ''
              }`}
            >
              {task.description}
            </Text>
          ) : null}

          {/* Date and Badges Row */}
          <View className="flex-row items-center flex-wrap mt-3">
            {task.due_date ? (
              <View className="flex-row items-center mr-3 bg-gray-50 px-2.5 py-1 rounded-lg">
                <Feather name="calendar" size={12} color="#6b7280" />
                <Text className="text-xs text-gray-500 font-medium ml-1">
                  {formatDueDate(task.due_date)}
                </Text>
              </View>
            ) : null}

            {/* Sync Badge */}
            <View className={`flex-row items-center px-2 py-0.5 rounded-lg ${badge.bg}`}>
              <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dot}`} />
              <Text className={`text-[10px] font-bold uppercase tracking-wider ${badge.text}`}>
                {badge.label}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={handleDeletePress}
          activeOpacity={0.7}
          className="p-1.5 rounded-lg bg-red-50"
        >
          <Feather name="trash-2" size={15} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
