import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (title: string, description: string | null, dueDate: string | null) => Promise<void>;
}

type DatePreset = 'none' | 'today' | 'tomorrow' | 'week';

export default function AddTaskModal({ visible, onClose, onAdd }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preset, setPreset] = useState<DatePreset>('none');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [error, setError] = useState('');

  const calculateDate = (type: DatePreset) => {
    setPreset(type);
    const now = new Date();
    switch (type) {
      case 'today':
        setDueDate(new Date(now.setHours(23, 59, 59, 999)).toISOString());
        break;
      case 'tomorrow':
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        setDueDate(new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString());
        break;
      case 'week':
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        setDueDate(new Date(nextWeek.setHours(23, 59, 59, 999)).toISOString());
        break;
      case 'none':
      default:
        setDueDate(null);
        break;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    try {
      await onAdd(title, description || null, dueDate);
      // Reset form
      setTitle('');
      setDescription('');
      setPreset('none');
      setDueDate(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/40">
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="bg-white rounded-t-3xl p-6 border-t border-gray-100"
            >
              <View className="flex-row items-center justify-between mb-6">
                <Text className="text-xl font-bold text-gray-800">New Task</Text>
                <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-50">
                  <Feather name="x" size={20} color="#4b5563" />
                </TouchableOpacity>
              </View>

              {/* Title Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-600 mb-2">Title *</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What needs to be done?"
                  placeholderTextColor="#9ca3af"
                  className="w-full bg-gray-50 px-4 py-3 rounded-xl text-gray-800 border border-gray-100 focus:border-indigo-500 font-medium"
                />
                {error ? <Text className="text-red-500 text-xs mt-1">{error}</Text> : null}
              </View>

              {/* Description Input */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-600 mb-2">Description</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add details or notes..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  className="w-full bg-gray-50 px-4 py-3 rounded-xl text-gray-800 border border-gray-100 focus:border-indigo-500 min-h-[80px] text-left-top leading-relaxed"
                />
              </View>

              {/* Due Date Shortcut Presets */}
              <View className="mb-6">
                <Text className="text-sm font-semibold text-gray-600 mb-2">Due Date</Text>
                <View className="flex-row items-center flex-wrap gap-2">
                  <TouchableOpacity
                    onPress={() => calculateDate('none')}
                    className={`px-4 py-2.5 rounded-xl border ${
                      preset === 'none'
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        preset === 'none' ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      None
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => calculateDate('today')}
                    className={`px-4 py-2.5 rounded-xl border flex-row items-center ${
                      preset === 'today'
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <Feather name="clock" size={12} color={preset === 'today' ? '#ffffff' : '#4b5563'} className="mr-1" />
                    <Text
                      className={`text-xs font-semibold ml-1 ${
                        preset === 'today' ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      Today
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => calculateDate('tomorrow')}
                    className={`px-4 py-2.5 rounded-xl border flex-row items-center ${
                      preset === 'tomorrow'
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <Feather name="calendar" size={12} color={preset === 'tomorrow' ? '#ffffff' : '#4b5563'} className="mr-1" />
                    <Text
                      className={`text-xs font-semibold ml-1 ${
                        preset === 'tomorrow' ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      Tomorrow
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => calculateDate('week')}
                    className={`px-4 py-2.5 rounded-xl border flex-row items-center ${
                      preset === 'week'
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <Feather name="calendar" size={12} color={preset === 'week' ? '#ffffff' : '#4b5563'} className="mr-1" />
                    <Text
                      className={`text-xs font-semibold ml-1 ${
                        preset === 'week' ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      Next Week
                    </Text>
                  </TouchableOpacity>
                </View>
                {dueDate && (
                  <Text className="text-xs text-indigo-500 font-semibold mt-2.5">
                    Selected: {new Date(dueDate).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                )}
              </View>

              {/* Submit Buttons */}
              <TouchableOpacity
                onPress={handleSubmit}
                activeOpacity={0.8}
                className="w-full bg-indigo-600 py-3.5 rounded-xl items-center justify-center mb-2"
              >
                <Text className="text-white text-base font-bold">Create Task</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
