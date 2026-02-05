import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
ImageBackground, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import ConstitutionalScreen, { PanelPurple } from '../../components/ConstitutionalScreen';
import { createNotification, createNotifications } from '../../services/notifications';


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function WorkerProfileView() {
  const { workerId, applicationId } = useLocalSearchParams();
  const router = useRouter();

  // make sure we always have plain strings
  const workerIdStr = Array.isArray(workerId) ? workerId[0] : workerId;
  const applicationIdStr = Array.isArray(applicationId)
    ? applicationId[0]
    : applicationId || null;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToFavorites, setAddingToFavorites] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      if (!workerIdStr) {
        Alert.alert('Error', 'No worker selected.');
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', workerIdStr)
        .single();

      if (error) throw error;

      setProfile(data);

      // Check if worker is already in favorites
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: favoriteData } = await supabase
          .from('favorites')
          .select('id')
          .eq('employer_id', user.id)
          .eq('worker_id', workerIdStr)
          .maybeSingle();

        setIsFavorite(!!favoriteData);
      }
    } catch (err) {
      console.log('Worker profile load error:', err);
      Alert.alert('Error', 'Unable to load worker profile.');
    } finally {
      setLoading(false);
    }
  };

  // ACCEPT WORKER – updates exactly ONE application row by id
  // Also auto-rejects all other pending applications for the same shift
  const handleAccept = async () => {
    console.log('handleAccept pressed', { workerIdStr, applicationIdStr });

    if (!applicationIdStr) {
      Alert.alert('Error', 'Missing application ID.');
      return;
    }

    try {
      setUpdating(true);

      // 1. Get the application to find shift_id
      const { data: currentApp, error: fetchError } = await supabase
        .from('applications')
        .select('shift_id')
        .eq('id', applicationIdStr)
        .single();

      if (fetchError || !currentApp) {
        throw new Error('Unable to find application');
      }

      const shiftId = currentApp.shift_id;
      const now = new Date().toISOString();

      // 2. Accept the selected application
      const { error: acceptError } = await supabase
        .from('applications')
        .update({
          status: 'accepted',
          accepted_at: now,
          rejected_at: null,
          rejection_reason: null,
          updated_at: now,
        })
        .eq('id', applicationIdStr);

      if (acceptError) throw acceptError;

      // Get shift and worker info for notifications
      const { data: shiftInfo } = await supabase
        .from('shifts')
        .select('job_title')
        .eq('id', shiftId)
        .single();

      const { data: acceptedApp } = await supabase
        .from('applications')
        .select('worker_id')
        .eq('id', applicationIdStr)
        .single();

      // Notify accepted worker
      if (acceptedApp?.worker_id) {
        try {
          console.log('🔵 [ACCEPT] Starting notification process for accepted worker...', {
            workerId: acceptedApp.worker_id,
            shiftId,
            applicationId: applicationIdStr,
          });

          const notificationOptions = {
            userId: acceptedApp.worker_id,
            type: 'application' as const,
            title: 'Application Accepted!',
            message: `Congratulations! Your application for "${shiftInfo?.job_title || 'shift'}" has been accepted.`,
            link: `/worker/shift/${shiftId}`,
          };

          console.log('🔵 [ACCEPT] Creating notification for accepted worker:', notificationOptions);

          const notificationResult = await createNotification(notificationOptions);

          if (notificationResult?.id) {
            console.log('✅ [ACCEPT] Notification created successfully for accepted worker:', {
              notificationId: notificationResult.id,
              workerId: acceptedApp.worker_id,
            });
          } else {
            console.warn('⚠️ [ACCEPT] Notification creation returned null for accepted worker:', {
              workerId: acceptedApp.worker_id,
            });
          }
        } catch (notifErr) {
          console.error('🔴 [ACCEPT] Error notifying accepted worker (non-critical):', notifErr);
          console.error('🔴 [ACCEPT] Error details:', JSON.stringify(notifErr, null, 2));
        }
      } else {
        console.warn('⚠️ [ACCEPT] No worker_id found in accepted application, cannot send notification');
      }

      // 3. Auto-reject all other pending applications for this shift
      const { data: rejectedApps, error: rejectError } = await supabase
        .from('applications')
        .update({
          status: 'rejected',
          rejected_at: now,
          rejection_reason: 'Position filled',
          updated_at: now,
        })
        .eq('shift_id', shiftId)
        .eq('status', 'pending') // Only reject pending ones
        .neq('id', applicationIdStr) // Don't reject the one we just accepted
        .select('worker_id');

      if (rejectError) {
        console.error('Error auto-rejecting other applications:', rejectError);
        // Don't fail the whole operation if auto-reject fails
        // But still show a warning
        Alert.alert(
          'Worker Accepted',
          'Worker has been accepted, but there was an issue notifying other applicants.',
        );
        router.back();
        return;
      }

      // Notify rejected workers
      if (rejectedApps && rejectedApps.length > 0) {
        try {
          const rejectNotifications = rejectedApps.map(app => ({
            userId: app.worker_id,
            type: 'application' as const,
            title: 'Application Update',
            message: `Your application for "${shiftInfo?.job_title || 'shift'}" was not selected. Position has been filled.`,
            link: `/worker/shift/${shiftId}`,
          }));
          await createNotifications(rejectNotifications);
        } catch (notifErr) {
          console.error('Error notifying rejected workers (non-critical):', notifErr);
        }
      }

      const rejectedCount = rejectedApps?.length || 0;
      const message =
        rejectedCount > 0
          ? `Worker has been accepted. ${rejectedCount} other applicant${rejectedCount !== 1 ? 's' : ''} ${rejectedCount !== 1 ? 'have' : 'has'} been notified.`
          : 'Worker has been accepted.';

      Alert.alert('Success', message);
      router.back();
    } catch (err) {
      console.log('Accept error:', err);
      Alert.alert('Error', 'Unable to accept the worker.');
    } finally {
      setUpdating(false);
    }
  };

  // ADD TO FAVORITES
  const handleAddToFavorites = async () => {
    if (!workerIdStr) {
      Alert.alert('Error', 'No worker selected.');
      return;
    }

    try {
      setAddingToFavorites(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('employer_id', user.id)
          .eq('worker_id', workerIdStr);

        if (error) throw error;

        setIsFavorite(false);
        Alert.alert('Removed', 'Worker removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .upsert(
            { employer_id: user.id, worker_id: workerIdStr },
            { onConflict: 'employer_id,worker_id' }
          );

        if (error) throw error;

        setIsFavorite(true);
        Alert.alert('Added', 'Worker added to favorites');
      }
    } catch (err) {
      console.log('Favorite error:', err);
      Alert.alert('Error', 'Unable to update favorites');
    } finally {
      setAddingToFavorites(false);
    }
  };

  // REJECT WORKER – same idea, only this one application
  const handleReject = async () => {
    console.log('handleReject pressed', { workerIdStr, applicationIdStr });

    if (!applicationIdStr) {
      Alert.alert('Error', 'Missing application ID.');
      return;
    }

    try {
      setUpdating(true);

      const now = new Date().toISOString();

      // Get application details for notification
      const { data: appData, error: appFetchError } = await supabase
        .from('applications')
        .select('shift_id, worker_id')
        .eq('id', applicationIdStr)
        .single();

      if (appFetchError) throw appFetchError;

      const { data, error } = await supabase
        .from('applications')
        .update({
          status: 'rejected',
          rejected_at: now,
          rejection_reason: 'Not selected',
          updated_at: now,
        })
        .eq('id', applicationIdStr)
        .select('*')
        .single();

      console.log('REJECT RESULT:', { data, error });

      if (error) throw error;

      // Notify worker about rejection
      if (appData?.worker_id && appData?.shift_id) {
        try {
          const { data: shiftInfo } = await supabase
            .from('shifts')
            .select('job_title')
            .eq('id', appData.shift_id)
            .single();

          await createNotification({
            userId: appData.worker_id,
            type: 'application',
            title: 'Application Update',
            message: `Your application for "${shiftInfo?.job_title || 'shift'}" was not selected. Keep trying!`,
            link: `/worker/shift/${appData.shift_id}`,
          });
        } catch (notifErr) {
          console.error('Error notifying worker about rejection (non-critical):', notifErr);
          // Don't fail rejection if notification fails
        }
      }

      Alert.alert('Rejected', 'Worker has been rejected.');
      router.back();
    } catch (err) {
      console.log('Reject error:', err);
      Alert.alert('Error', 'Unable to reject the worker.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading worker profile…</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text>No profile found.</Text>
      </View>
    );
  }

  const onBack = () => {
    if (from && typeof from === 'string') router.replace(from as any);
    else router.replace('/employer/applications');
  };

  return (
    <ConstitutionalScreen title="Worker Profile" showBack onBack={onBack} showLogo theme="light">
      <ScrollView style={styles.container}>
      <PanelPurple style={{ marginBottom: 12 }}>
          <Text style={styles.nameText}>
            {profile.full_name || 'Unnamed Worker'}
          </Text>

          <Text style={styles.bioText}>
            {profile.bio || 'No bio provided yet.'}
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="briefcase-outline" size={18} color="#8B5CF6" />
            <Text style={styles.infoText}>
              Experience: {profile.experience_level || 'Not provided'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="star-outline" size={18} color="#8B5CF6" />
            <Text style={styles.infoText}>
              Skills:{' '}
              {Array.isArray(profile.skills)
                ? profile.skills.join(', ')
                : profile.skills || 'Not listed'}
            </Text>
          </View>
      </PanelPurple>

      {/* FAVORITES BUTTON */}
      <View style={styles.favoritesContainer}>
        <Button
          mode={isFavorite ? 'contained' : 'outlined'}
          disabled={addingToFavorites}
          onPress={handleAddToFavorites}
          icon={isFavorite ? 'star' : 'star-outline'}
          loading={addingToFavorites}
          buttonColor={isFavorite ? '#8B5CF6' : undefined}
          textColor={isFavorite ? '#FFFFFF' : '#8B5CF6'}
          style={{ marginVertical: 8 }}
          contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
        >
          {addingToFavorites
            ? 'Updating…'
            : isFavorite
            ? '⭐ Favorited'
            : 'Add to Favorites ⭐'}
        </Button>
      </View>

      {/* BUTTONS */}
      <View style={styles.actions}>
        <Button
          mode="contained"
          disabled={updating}
          onPress={handleAccept}
          loading={updating}
          icon="check-circle"
          buttonColor="#3B82F6"
          style={{ flex: 1, marginRight: 8 }}
          contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
        >
          Accept
        </Button>

        <Button
          mode="contained"
          disabled={updating}
          onPress={handleReject}
          loading={updating}
          icon="close-circle"
          buttonColor="#7C3AED"
          style={{ flex: 1, marginLeft: 8 }}
          contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
        >
          Reject
        </Button>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </ConstitutionalScreen>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: { flex: 1, backgroundColor: 'transparent' },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: { marginTop: 10, color: '#6B7280' },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },

  nameText: { fontSize: 22, fontWeight: 'bold', color: '#111827' },

  bioText: { marginTop: 10, fontSize: 14, color: '#6B7280' },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },

  infoText: { marginLeft: 8, fontSize: 14, color: '#111827' },

  favoritesContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  favoriteButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  favoriteText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  favoriteTextActive: {
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 40,
    gap: 12,
  },

  acceptButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  acceptText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  rejectButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  rejectText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
