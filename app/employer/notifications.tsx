import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function NotificationSettings() {
  const router = useRouter();

  const [newApplications, setNewApplications] = useState(true);
  const [shiftUpdates, setShiftUpdates] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.replace('/employer/profile')}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification settings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.container}>
        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title title="Shift notifications" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>New applications</Text>
              <Switch
                value={newApplications}
                onValueChange={setNewApplications}
                trackColor={{ false: '#DDD', true: '#8B5CF6' }}
                thumbColor="#FFF"
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Shift updates</Text>
              <Switch
                value={shiftUpdates}
                onValueChange={setShiftUpdates}
                trackColor={{ false: '#DDD', true: '#8B5CF6' }}
                thumbColor="#FFF"
              />
            </View>
          </Card.Content>
        </Card>

        <Card mode="elevated" style={{ marginBottom: 12 }}>
          <Card.Title title="System notifications" titleStyle={{ fontSize: 16, fontWeight: 'bold' }} />
          <Card.Content>
            <View style={styles.row}>
              <Text style={styles.label}>System alerts</Text>
              <Switch
                value={systemAlerts}
                onValueChange={setSystemAlerts}
                trackColor={{ false: '#DDD', true: '#8B5CF6' }}
                thumbColor="#FFF"
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Marketing & updates</Text>
              <Switch
                value={marketing}
                onValueChange={setMarketing}
                trackColor={{ false: '#DDD', true: '#8B5CF6' }}
                thumbColor="#FFF"
              />
            </View>
          </Card.Content>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  container: {
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 15,
    color: '#111827',
  },
});
