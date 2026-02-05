/**
 * ConstitutionalScreen – Alkotmányos dizájn (referencia képek alapján)
 * docs/DESIGN_SPEC_REFERENCE.md – light theme: világosszürke háttér, fehér kártyák, gradient csak fejlécben és fő gombokon.
 * Login oldalak változatlanok maradnak (nem használják ezt a komponenst).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const GRADIENT_HEADER = ['#9333EA', '#7C3AED', '#3B82F6'] as const;
/** Teljes (nem átlátszó) háttérpanel – ugyanaz a kép + gradient mint a login oldalakon, telt formában. Login oldalakat ne módosítsd. */
const GRADIENT_BG_FULL = ['#8B5CF6', '#3B82F6', '#9333EA'] as const;
const PANEL_PURPLE = '#F3E8FF';
const PANEL_BLUE = '#DBEAFE';
const WHITE = '#FFFFFF';
const CONTENT_BG_LIGHT = '#F8F9FA';
const CARD_BORDER_LIGHT = '#E2E8F0';
const CARD_SHADOW = '#000000';

export interface ConstitutionalScreenProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
  showFooter?: boolean;
  scrollable?: boolean;
  contentStyle?: ViewStyle;
  /** Referencia szerint: 'light' = világosszürke háttér + fehér kártyák; 'gradient' = teljes gradient háttér (régi) */
  theme?: 'light' | 'gradient';
}

export default function ConstitutionalScreen({
  children,
  title,
  showBack = true,
  onBack,
  showLogo = true,
  showFooter = false,
  scrollable = true,
  contentStyle,
  theme = 'light',
}: ConstitutionalScreenProps) {
  const isLight = theme === 'light';

  const content = (
    <>
      {showLogo && (
        <View style={[styles.logoBox, isLight && styles.logoBoxLight]}>
          <Image source={require('../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
      )}

      {title != null && (
        <LinearGradient colors={GRADIENT_HEADER} style={styles.header}>
          {showBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={WHITE} />
            </TouchableOpacity>
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          {showBack ? <View style={styles.headerSpacer} /> : null}
        </LinearGradient>
      )}

      {scrollable ? (
        <ScrollView
          style={[styles.scroll, isLight && styles.scrollLight]}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.staticContent, contentStyle, isLight && styles.scrollLight]}>{children}</View>
      )}

      {showFooter && (
        <Text style={[styles.footer, isLight && styles.footerLight]}>FlexiWork v1.0.0</Text>
      )}
    </>
  );

  if (isLight) {
    return <View style={styles.containerLight}>{content}</View>;
  }

  return (
    <ImageBackground source={require('../assets/images/background.webp')} style={styles.container} resizeMode="cover">
      <LinearGradient colors={GRADIENT_BG} style={StyleSheet.absoluteFillObject} />
      {content}
    </ImageBackground>
  );
}

type PanelProps = { children: React.ReactNode; style?: ViewStyle; onPress?: () => void };

/** Fehér kártya – referencia: fehér háttér, enyhe árnyék, vékony szürke keret; nyomáskor enyhe visszajelzés */
export const CardWhite = ({ children, style, onPress }: PanelProps) => {
  const base = [styles.cardWhite, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && styles.panelPressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
};

/** Enyhe lila panel – infó / szekció kiemelés (referencia: világos lila háttér) */
export const PanelPurple = ({ children, style, onPress }: PanelProps) => {
  const base = [styles.panelPurple, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && styles.panelPressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
};

/** Enyhe kék panel – infó / szekció kiemelés (referencia: világos kék háttér) */
export const PanelBlue = ({ children, style, onPress }: PanelProps) => {
  const base = [styles.panelBlue, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && styles.panelPressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerLight: {
    flex: 1,
    backgroundColor: CONTENT_BG_LIGHT,
  },
  logoBox: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 52,
    left: 16,
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    padding: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logoBoxLight: {
    backgroundColor: WHITE,
    shadowColor: CARD_SHADOW,
    shadowOpacity: 0.08,
  },
  logo: { width: 32, height: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 70 : 100,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: WHITE },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollLight: { backgroundColor: 'rgba(248,249,250,0.94)' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 },
  staticContent: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  footer: { textAlign: 'center', marginTop: 24, marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  footerLight: { color: '#64748B' },
  panelPressed: { opacity: 0.92 },
  panelPurple: {
    backgroundColor: PANEL_PURPLE,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER_LIGHT,
    shadowColor: CARD_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  panelBlue: {
    backgroundColor: PANEL_BLUE,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER_LIGHT,
    shadowColor: CARD_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  cardWhite: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER_LIGHT,
    shadowColor: CARD_SHADOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
});
