import { useEffect, useRef } from 'react';
import { useRouter, usePathname, useSegments } from 'expo-router';

/**
 * Hook to track navigation history and provide smart back navigation
 * Tracks where user came from and provides intelligent back button behavior
 */
export function useNavigationHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const historyRef = useRef<string[]>([]);

  useEffect(() => {
    // Add current path to history if it's not already the last one
    if (historyRef.current[historyRef.current.length - 1] !== pathname) {
      historyRef.current.push(pathname);
      // Keep only last 10 entries to prevent memory issues
      if (historyRef.current.length > 10) {
        historyRef.current.shift();
      }
    }
  }, [pathname]);

  /**
   * Get the previous path from history
   */
  const getPreviousPath = (): string | null => {
    const history = historyRef.current;
    if (history.length < 2) return null;
    return history[history.length - 2];
  };

  /**
   * Smart back navigation - goes to previous page or fallback
   */
  const goBack = (fallback?: string) => {
    const previous = getPreviousPath();
    
    if (previous && previous !== pathname) {
      // Check if previous is valid (not auth pages, not same as current)
      if (!previous.includes('/auth/') && previous !== pathname) {
        router.replace(previous as any);
        return;
      }
    }
    
    // Use fallback or default
    if (fallback) {
      router.replace(fallback as any);
    } else {
      router.back();
    }
  };

  /**
   * Get default fallback path based on current route
   */
  const getDefaultFallback = (): string => {
    const path = pathname || '';
    
    // Worker routes
    if (path.includes('/worker/')) {
      if (path.includes('/shift/')) return '/worker/browse-shifts';
      if (path.includes('/profile')) return '/worker';
      if (path.includes('/settings')) return '/worker/profile';
      if (path.includes('/edit-profile')) return '/worker/profile';
      if (path.includes('/my-shifts')) return '/worker';
      if (path.includes('/applications')) return '/worker';
      if (path.includes('/earnings')) return '/worker';
      if (path.includes('/earning/')) return '/worker/earnings';
      if (path.includes('/timesheet/')) return '/worker/my-shifts';
      if (path.includes('/review-employer/')) return '/worker/my-shifts';
      if (path.includes('/browse-shifts')) return '/worker';
      return '/worker';
    }
    
    // Employer routes
    if (path.includes('/employer/')) {
      if (path.includes('/shift/')) return '/employer/my-shifts';
      if (path.includes('/post-shift')) return '/employer';
      if (path.includes('/profile')) return '/employer';
      if (path.includes('/settings')) return '/employer/profile';
      if (path.includes('/edit-profile')) return '/employer/profile';
      if (path.includes('/my-shifts')) return '/employer';
      if (path.includes('/applications')) return '/employer';
      if (path.includes('/timesheet/')) return '/employer/my-shifts';
      if (path.includes('/payment/')) return '/employer/payments';
      if (path.includes('/payments')) return '/employer';
      if (path.includes('/worker-profile')) return '/employer/applications';
      if (path.includes('/favorites')) return '/employer';
      if (path.includes('/review-worker/')) return '/employer/my-shifts';
      if (path.includes('/notifications')) return '/employer/profile';
      return '/employer';
    }
    
    return '/';
  };

  /**
   * Smart back with automatic fallback
   */
  const smartBack = () => {
    goBack(getDefaultFallback());
  };

  return {
    goBack,
    smartBack,
    getPreviousPath,
    getDefaultFallback,
    history: historyRef.current,
  };
}
