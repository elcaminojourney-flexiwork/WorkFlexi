import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { TextInput, Button } from 'react-native-paper';
import { supabase } from '../../supabase';
import { Ionicons } from '@expo/vector-icons';
import { uploadProfilePhoto, pickImage } from '../../services/file-upload';

type EmployerProfile = {
  id: string;
  company_name: string | null;
  company_registration: string | null;
  company_address: string | null;
  industry: string | null;
  contact_person: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  phone: string | null;
  location: string | null;
  email: string | null;
  profile_photo_url: string | null;
};


// Modern FlexiWork Colors
const COLORS = {
  purple50: '#FAF5FF', purple100: '#F3E8FF', purple200: '#E9D5FF', purple500: '#A855F7', purple600: '#9333EA', purple700: '#7C3AED',
  blue50: '#EFF6FF', blue100: '#DBEAFE', blue200: '#BFDBFE', blue500: '#3B82F6', blue600: '#2563EB', blue700: '#1D4ED8',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151', gray900: '#111827',
  white: '#FFFFFF',
};

export default function EditEmployerProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [companyReg, setCompanyReg] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [mainPhone, setMainPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
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
        Alert.alert('Error', 'Please login again.');
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .eq('user_type', 'employer')
        .single();

      if (error) throw error;

      const profile = data as EmployerProfile;

      setCompanyName(profile.company_name || '');
      setCompanyReg(profile.company_registration || '');
      setCompanyAddress(profile.company_address || '');
      setIndustry(profile.industry || '');
      setContactPerson(profile.contact_person || '');
      setContactRole(profile.contact_role || '');
      setContactPhone(profile.contact_phone || profile.phone || '');
      setBillingEmail(profile.billing_email || profile.email || '');
      setMainPhone(profile.phone || '');
      setLocation(profile.location || '');
      setLoginEmail(profile.email || null);
      setProfilePhotoUrl(profile.profile_photo_url || null);
    } catch (err) {
      console.log('Error loading employer profile for edit:', err);
      Alert.alert('Error', 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    if (!companyName.trim()) {
      Alert.alert('Missing info', 'Please enter your company name.');
      return false;
    }
    if (!contactPerson.trim()) {
      Alert.alert('Missing info', 'Please enter a contact person.');
      return false;
    }
    if (!billingEmail.trim()) {
      Alert.alert('Missing info', 'Please enter a billing email.');
      return false;
    }
    if (!billingEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid billing email.');
      return false;
    }
    return true;
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

      const result = await uploadProfilePhoto(user.id, imageUri);
      if (result.error) {
        Alert.alert('Error', result.error);
        return;
      }

      setProfilePhotoUrl(result.url);
      Alert.alert('Success', 'Logo uploaded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };


  const handleSave = async () => {
    try {
      if (!validate()) return;

      setSaving(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'Please login again.');
        router.replace('/auth/login');
        return;
      }

      const updates = {
        company_name: companyName.trim(),
        company_registration: companyReg.trim() || null,
        company_address: companyAddress.trim() || null,
        industry: industry.trim() || null,
        contact_person: contactPerson.trim() || null,
        contact_role: contactRole.trim() || null,
        contact_phone: contactPhone.trim() || null,
        billing_email: billingEmail.trim(),
        phone: mainPhone.trim() || null,
        location: location.trim() || null,
        profile_photo_url: profilePhotoUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .eq('user_type', 'employer');

      if (error) throw error;

      Alert.alert('Saved', 'Your profile has been updated.', [
        {
          text: 'OK',
          onPress: () => router.replace('/employer/profile'),
        },
      ]);
    } catch (err) {
      console.log('Error saving employer profile:', err);
      Alert.alert('Error', 'Unable to save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading profile…</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Company section */}
        <Text style={styles.sectionTitle}>Company details</Text>

        <TextInput
          label="Company name *"
          value={companyName}
          onChangeText={setCompanyName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Registration number"
          value={companyReg}
          onChangeText={setCompanyReg}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Company address"
          value={companyAddress}
          onChangeText={setCompanyAddress}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <TextInput
          label="Industry"
          value={industry}
          onChangeText={setIndustry}
          mode="outlined"
          style={styles.input}
        />

        {/* Contact section */}
        <Text style={styles.sectionTitle}>Contact person</Text>

        <TextInput
          label="Contact person *"
          value={contactPerson}
          onChangeText={setContactPerson}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Role / position"
          value={contactRole}
          onChangeText={setContactRole}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Contact phone"
          value={contactPhone}
          onChangeText={setContactPhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />

        {/* Account + billing */}
        <Text style={styles.sectionTitle}>Account & billing</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Login email (read-only)</Text>
          <Text style={styles.readonlyValue}>
            {loginEmail || 'Not set'}
          </Text>
        </View>

        <TextInput
          label="Billing email *"
          value={billingEmail}
          onChangeText={setBillingEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          label="Main phone (optional)"
          value={mainPhone}
          onChangeText={setMainPhone}
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

        {/* Logo Upload Section */}
        <Text style={styles.sectionTitle}>Upload your logo</Text>
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
            {profilePhotoUrl ? 'Change logo' : 'Upload your logo'}
          </Button>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.replace('/employer/profile')}
          disabled={saving}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Save changes</Text>
          )}
        </TouchableOpacity>
      </View>
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
  center: {
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
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  readonlyValue: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
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
    borderColor: '#8B5CF6',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
  },
});
