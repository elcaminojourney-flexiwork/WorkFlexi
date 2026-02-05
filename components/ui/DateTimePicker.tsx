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
  // Web platform: custom dropdowns so the picker stays inline (no browser popup at bottom)
  if (Platform.OS === 'web') {
    const inputStyle: React.CSSProperties = {
      padding: '10px 12px',
      borderRadius: '8px',
      border: `1px solid ${colors.borderMedium || '#D8B4FE'}`,
      fontSize: '16px',
      fontFamily: 'inherit',
      width: '100%',
      backgroundColor: '#fff',
    };
    if (mode === 'date') {
      const day = value.getDate();
      const month = value.getMonth();
      const year = value.getFullYear();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const handleChange = (newDay: number, newMonth: number, newYear: number) => {
        const d = new Date(newYear, newMonth, Math.min(newDay, new Date(newYear, newMonth + 1, 0).getDate()));
        onChange({ type: 'set' }, d);
      };
      return (
        <View style={[style, { flexDirection: 'row', gap: 8 }]}>
          {/* @ts-ignore */}
          <select value={day} onChange={(e) => handleChange(parseInt(e.target.value, 10), month, year)} style={{ ...inputStyle, flex: 1 }}>
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {/* @ts-ignore */}
          <select value={month} onChange={(e) => handleChange(day, parseInt(e.target.value, 10), year)} style={{ ...inputStyle, flex: 2 }}>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          {/* @ts-ignore */}
          <select value={year} onChange={(e) => handleChange(day, month, parseInt(e.target.value, 10))} style={{ ...inputStyle, flex: 1 }}>
            {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </View>
      );
    }
    if (mode === 'time') {
      const hours = value.getHours();
      const minutes = value.getMinutes();
      const handleChange = (h: number, m: number) => {
        const d = new Date(value);
        d.setHours(h, m, 0, 0);
        onChange({ type: 'set' }, d);
      };
      return (
        <View style={[style, { flexDirection: 'row', gap: 8 }]}>
          {/* @ts-ignore */}
          <select value={hours} onChange={(e) => handleChange(parseInt(e.target.value, 10), minutes)} style={{ ...inputStyle, flex: 1 }}>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{i === 0 ? '12' : i > 12 ? i - 12 : i}:00 {i < 12 ? 'AM' : 'PM'}</option>
            ))}
          </select>
          {/* @ts-ignore */}
          <select value={minutes} onChange={(e) => handleChange(hours, parseInt(e.target.value, 10))} style={{ ...inputStyle, flex: 1 }}>
            {Array.from({ length: 60 }, (_, m) => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>
        </View>
      );
    }
    if (mode === 'datetime') {
      const day = value.getDate();
      const month = value.getMonth();
      const year = value.getFullYear();
      const hours = value.getHours();
      const minutes = value.getMinutes();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return (
        <View style={style}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {/* @ts-ignore */}
            <select value={day} onChange={(e) => { const d = new Date(year, month, parseInt(e.target.value, 10), hours, minutes); onChange({ type: 'set' }, d); }} style={{ ...inputStyle, flex: 1 }}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {/* @ts-ignore */}
            <select value={month} onChange={(e) => { const d = new Date(year, parseInt(e.target.value, 10), day, hours, minutes); onChange({ type: 'set' }, d); }} style={{ ...inputStyle, flex: 2 }}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            {/* @ts-ignore */}
            <select value={year} onChange={(e) => { const d = new Date(parseInt(e.target.value, 10), month, day, hours, minutes); onChange({ type: 'set' }, d); }} style={{ ...inputStyle, flex: 1 }}>
              {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* @ts-ignore */}
            <select value={hours} onChange={(e) => { const d = new Date(value); d.setHours(parseInt(e.target.value, 10), minutes, 0, 0); onChange({ type: 'set' }, d); }} style={{ ...inputStyle, flex: 1 }}>
              {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i === 0 ? '12' : i > 12 ? i - 12 : i}:00 {i < 12 ? 'AM' : 'PM'}</option>)}
            </select>
            {/* @ts-ignore */}
            <select value={minutes} onChange={(e) => { const d = new Date(value); d.setMinutes(parseInt(e.target.value, 10), 0, 0); onChange({ type: 'set' }, d); }} style={{ ...inputStyle, flex: 1 }}>
              {Array.from({ length: 60 }, (_, m) => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
            </select>
          </View>
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

