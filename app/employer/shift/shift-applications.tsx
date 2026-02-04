import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, Chip } from 'react-native-paper';
import { supabase } from '../../../supabase';
import { Ionicons } from '@expo/vector-icons';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function ShiftApplicationsPage() {
  const { shiftId } = useLocalSearchParams();
  const router = useRouter();

  const shiftIdStr = Array.isArray(shiftId) ? shiftId[0] : shiftId;

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);

      if (!shiftIdStr) {
        Alert.alert('Error', 'No shift selected');
        router.replace('/employer/applications');
        return;
      }

      const { data, error } = await supabase
        .from('applications')
        .select(
          `
          id,
          shift_id,
          worker_id,
          status,
          applied_at,
          note,
          worker:profiles!applications_worker_id_fkey (
            full_name,
            phone
          )
        `
        )
        .eq('shift_id', shiftIdStr)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      setApplications(data || []);
    } catch (err) {
      console.log('Load shift applications error:', err);
      Alert.alert('Error', 'Unable to load applications for this shift');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: any) => {
    if (!value) return '-';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#A855F7';
      case 'accepted':
        return '#3B82F6';
      case 'rejected':
        return '#7C3AED';
      case 'withdrawn':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const renderApplication = ({ item }: { item: any }) => {
    const worker = item.worker;

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(
            `/employer/worker-profile?workerId=${item.worker_id}&applicationId=${item.id}&from=/employer/shift/shift-applications?shiftId=${shiftIdStr}`
          )
        }
        style={{ marginBottom: 12 }}
      >
        <Card mode="elevated" style={{ marginBottom: 0 }}>
          <Card.Content>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.nameText}>
                  {worker?.full_name || 'Unnamed worker'}
                </Text>
                <Text style={styles.subText}>
                  Applied: {formatDate(item.applied_at)}
                </Text>
                {item.note ? (
                  <Text style={styles.noteText}>Note: {item.note}</Text>
                ) : null}
              </View>

              <Chip
                mode="flat"
                style={{ backgroundColor: getStatusColor(item.status) }}
                textStyle={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
              >
                {item.status}
              </Chip>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading applications…</Text>
      </View>
    );
  }

  if (!loading && applications.length === 0) {
    return (
      <View style={styles.screen}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => {
              if (from && typeof from === 'string') {
                router.replace(from as any);
              } else {
                router.replace('/employer/applications');
              }
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shift applications</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.center}>
          <Text style={styles.emptyText}>No applications yet for this shift.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shift applications</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.id}
        renderItem={renderApplication}
        contentContainerStyle={{ padding: 20 }}
      />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    position: 'relative',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  subText: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 14,
  },
  noteText: {
    marginTop: 4,
    fontSize: 13,
    color: '#374151',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  arrowContainer: {
    position: 'absolute',
    top: '50%',
    right: 12,
    transform: [{ translateY: -12 }],
  },
});
