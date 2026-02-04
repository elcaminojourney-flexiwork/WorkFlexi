import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Switch,
  Image,
  Platform,
ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { TextInput } from 'react-native-paper';
import { Button } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import { uploadDocument, pickDocument, uploadWorkerProfilePhoto, pickImage } from '../../services/file-upload';

type WorkerProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  skills: string | null;
  experience_level: string | null;
  job_types_interested: string | null;
  preferred_location: string | null;
  preferred_area: string | null;
  availability: string | null;
  has_work_permit: boolean | null;
  bio: string | null;
  cv_url: string | null;
  profile_photo_url: string | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function EditWorkerProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [jobTypes, setJobTypes] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('');
  const [preferredArea, setPreferredArea] = useState('');
  const [availability, setAvailability] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [hasWorkPermit, setHasWorkPermit] = useState(false);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/select-user-type');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          full_name,
          email,
          phone,
          location,
          skills,
          experience_level,
          job_types_interested,
          preferred_location,
          preferred_area,
          availability,
          has_work_permit,
          bio,
          cv_url,
          profile_photo_url
        `
        )
        .eq('id', user.id)
        .eq('user_type', 'worker')
        .single();

      if (error) {
        // if no profile yet, we just keep default empty form
        console.log('No existing worker profile or error:', error);
        setLoading(false);
        return;
      }

      const p = data as WorkerProfile;

      setFullName(p.full_name || '');
      setEmail(p.email || '');
      setPhone(p.phone || '');
      setLocation(p.location || '');
      setExperienceLevel(p.experience_level || '');
      setJobTypes(p.job_types_interested || '');
      setPreferredLocation(p.preferred_location || '');
      setPreferredArea(p.preferred_area || '');
      setAvailability(p.availability || '');
      setSkills(p.skills || '');
      setBio(p.bio || '');
      setHasWorkPermit(p.has_work_permit ?? false);
      setCvUrl(p.cv_url || null);
      setProfilePhotoUrl(p.profile_photo_url || null);
    } catch (err) {
      console.log('Error loading worker profile for edit:', err);
      Alert.alert('Error', 'Unable to load your profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickProfilePhoto = async () => {
    try {
      const imageUri = await pickImage();
      if (!imageUri) return;

      setUploadingPhoto(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const result = await uploadWorkerProfilePhoto(user.id, imageUri);
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      setProfilePhotoUrl(result.url);
      Alert.alert('Success', 'Profile photo uploaded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePickCV = async () => {
    try {
      const doc = await pickDocument();
      if (!doc.uri || !doc.name) return;

      setUploadingCv(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const result = await uploadDocument(
        user.id,
        doc.uri,
        doc.name,
        doc.mimeType || 'application/pdf'
      );
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      setCvUrl(result.url);
      Alert.alert('Success', 'CV uploaded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload CV');
    } finally {
      setUploadingCv(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again');
        router.replace('/auth/select-user-type');
        return;
      }

      const updateData = {
        id: user.id,
        user_type: 'worker',
        full_name: fullName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        location: location.trim() || null,
        skills: skills.trim() || null,
        experience_level: experienceLevel.trim() || null,
        job_types_interested: jobTypes.trim() || null,
        preferred_location: preferredLocation.trim() || null,
        preferred_area: preferredArea.trim() || null,
        availability: availability.trim() || null,
        has_work_permit: hasWorkPermit,
        bio: bio.trim() || null,
        cv_url: cvUrl,
        profile_photo_url: profilePhotoUrl,
        onboarding_completed: true,
        profile_status: 'pending_review',
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updateData, {
        onConflict: 'id',
      });

      if (error) throw error;

      Alert.alert('Saved', 'Your profile has been updated.', [
        {
          text: 'OK',
          onPress: () => router.replace('/worker/profile'),
        },
      ]);
    } catch (err) {
      console.log('Error saving worker profile:', err);
      Alert.alert('Error', 'Could not save your profile, please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/worker/profile')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.formContainer}>
        {/* Basic info */}
        <Text style={styles.sectionTitle}>Basic info</Text>

        <TextInput
          label="Full name *"
          value={fullName}
          onChangeText={setFullName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />

        <TextInput
          label="Location (city / area)"
          value={location}
          onChangeText={setLocation}
          mode="outlined"
          style={styles.input}
        />

        {/* Profile Photo Upload Section */}
        <Text style={styles.sectionTitle}>Upload your photo</Text>
        <View style={styles.uploadSection}>
          {profilePhotoUrl ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: profilePhotoUrl }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setProfilePhotoUrl(null)}
              >
                <Ionicons name="close-circle" size={24} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          ) : null}
          <Button
            mode="outlined"
            onPress={handlePickProfilePhoto}
            loading={uploadingPhoto}
            disabled={uploadingPhoto}
            icon="camera"
            style={{ marginVertical: 8 }}
          >
            {profilePhotoUrl ? 'Change photo' : 'Upload your photo'}
          </Button>
        </View>

        {/* Work info */}
        <Text style={styles.sectionTitle}>Work info</Text>

        <TextInput
          label="Experience level"
          value={experienceLevel}
          onChangeText={setExperienceLevel}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Job types you want"
          value={jobTypes}
          onChangeText={setJobTypes}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Preferred location"
          value={preferredLocation}
          onChangeText={setPreferredLocation}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Preferred area (district / mall)"
          value={preferredArea}
          onChangeText={setPreferredArea}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Availability (days / time)"
          value={availability}
          onChangeText={setAvailability}
          mode="outlined"
          style={styles.input}
        />

        {/* Work permit */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>I have a valid work permit</Text>
            <Text style={styles.helperText}>
              This helps us show you only legal work options.
            </Text>
          </View>
          <Switch
            value={hasWorkPermit}
            onValueChange={setHasWorkPermit}
            trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
            thumbColor={hasWorkPermit ? '#3B82F6' : '#F9FAFB'}
          />
        </View>

        {/* Skills & bio */}
        <Text style={styles.sectionTitle}>Skills & bio</Text>

        <TextInput
          label="Skills"
          value={skills}
          onChangeText={setSkills}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="About you"
          value={bio}
          onChangeText={setBio}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        {/* CV Upload Section */}
        <Text style={styles.sectionTitle}>CV / Resume</Text>
        <View style={styles.uploadSection}>
          {cvUrl ? (
            <View style={styles.documentPreview}>
              <Ionicons name="document-text" size={24} color="#3B82F6" />
              <Text style={styles.documentName} numberOfLines={1}>
                CV uploaded
              </Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => {
                  // Open document in browser
                  if (Platform.OS === 'web') {
                    window.open(cvUrl, '_blank');
                  } else {
                    Alert.alert('CV', 'View CV in browser: ' + cvUrl);
                  }
                }}
              >
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setCvUrl(null)}
              >
                <Ionicons name="close-circle" size={24} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          ) : null}
          <Button
            mode="outlined"
            onPress={handlePickCV}
            loading={uploadingCv}
            disabled={uploadingCv}
            icon="file-document"
            style={{ marginVertical: 8 }}
          >
            {cvUrl ? 'Replace CV' : 'Upload CV / Resume'}
          </Button>
        </View>

        {/* Save button */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          icon="content-save"
          style={{ marginVertical: 16 }}
          contentStyle={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
        >
          Save changes
        </Button>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({

  logoBox: { position: 'absolute', top: Platform.OS === 'web' ? 16 : 52, left: 16, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, padding: 8, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  logo: { width: 32, height: 32 },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 14,
    color: '#6B7280',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    maxWidth: 220,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    marginTop: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  uploadSection: {
    marginBottom: 20,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 12,
    alignSelf: 'center',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
