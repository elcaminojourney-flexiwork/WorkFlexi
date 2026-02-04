/**
 * Cross-platform DateTimePicker Component
 * 
 * Handles web and mobile platforms with appropriate UI for each
 */

import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import DateTimePickerNative from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius } from '../../constants/theme';

export interface DateTimePickerProps {
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  display?: 'default' | 'spinner' | 'clock' | 'calendar';
  onChange: (event: any, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: any;
}

export function DateTimePicker({
  value,
  mode,
  display,
  onChange,
  minimumDate,
  maximumDate,
  style,
}: DateTimePickerProps) {
  // Web platform: Use HTML input
  if (Platform.OS === 'web') {
    if (mode === 'date') {
      const dateString = value.toISOString().split('T')[0];
      return (
        <View style={style}>
          {/* @ts-ignore - Web-only HTML input */}
          <input
            type="date"
            value={dateString}
            min={minimumDate?.toISOString().split('T')[0]}
            max={maximumDate?.toISOString().split('T')[0]}
            onChange={(e: any) => {
              if (e.target.value) {
                const newDate = new Date(e.target.value + 'T00:00:00');
                onChange({ type: 'set' }, newDate);
              }
            }}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.borderMedium}`,
              fontSize: '16px',
              fontFamily: 'inherit',
              width: '100%',
            }}
          />
        </View>
      );
    } else if (mode === 'time') {
      const hours = value.getHours().toString().padStart(2, '0');
      const minutes = value.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      return (
        <View style={style}>
          {/* @ts-ignore - Web-only HTML input */}
          <input
            type="time"
            value={timeString}
            onChange={(e: any) => {
              if (e.target.value) {
                const [hours, minutes] = e.target.value.split(':');
                const newDate = new Date(value);
                newDate.setHours(parseInt(hours, 10));
                newDate.setMinutes(parseInt(minutes, 10));
                onChange({ type: 'set' }, newDate);
              }
            }}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.borderMedium}`,
              fontSize: '16px',
              fontFamily: 'inherit',
              width: '100%',
            }}
          />
        </View>
      );
    } else if (mode === 'datetime') {
      const dateString = value.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
      return (
        <View style={style}>
          {/* @ts-ignore - Web-only HTML input */}
          <input
            type="datetime-local"
            value={dateString}
            min={minimumDate?.toISOString().slice(0, 16)}
            max={maximumDate?.toISOString().slice(0, 16)}
            onChange={(e: any) => {
              if (e.target.value) {
                const newDate = new Date(e.target.value);
                onChange({ type: 'set' }, newDate);
              }
            }}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.borderMedium}`,
              fontSize: '16px',
              fontFamily: 'inherit',
              width: '100%',
            }}
          />
        </View>
      );
    }
  }

  // Mobile platforms: Use native picker
  return (
    <DateTimePickerNative
      value={value}
      mode={mode}
      display={display || 'default'}
      onChange={onChange}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      style={style}
    />
  );
}

