import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Only show on web
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay (better UX)
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for custom event from index.html
    const handleInstallAvailable = () => {
      setShowPrompt(true);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: try global install function
      if (typeof (window as any).installPWA === 'function') {
        (window as any).installPWA();
      }
      setShowPrompt(false);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsInstalled(true);
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('pwa-prompt-dismissed', 'true');
    }
  };

  // Don't show if already installed or on native
  if (isInstalled || Platform.OS !== 'web' || !showPrompt) {
    return null;
  }

  return (
    <Modal
      visible={showPrompt}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="download-outline" size={32} color="#2563EB" />
            <Text style={styles.title}>Install FlexiWork</Text>
          </View>
          
          <Text style={styles.description}>
            Install FlexiWork on your device for a better experience. Access it quickly from your home screen.
          </Text>

          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to install:</Text>
            <View style={styles.instructionItem}>
              <Ionicons name="ellipse" size={8} color="#6B7280" />
              <Text style={styles.instructionText}>
                <Text style={styles.bold}>Android:</Text> Tap the menu (⋮) and select "Add to Home screen"
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Ionicons name="ellipse" size={8} color="#6B7280" />
              <Text style={styles.instructionText}>
                <Text style={styles.bold}>iOS:</Text> Tap the Share button and select "Add to Home Screen"
              </Text>
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleDismiss}
            >
              <Text style={styles.buttonTextSecondary}>Maybe Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleInstall}
            >
              <Text style={styles.buttonTextPrimary}>Install</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  instructions: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#374151',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563EB',
  },
  buttonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
