import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';

export type Notification = {
  id: string;
  type: 'application' | 'shift' | 'timesheet' | 'payment' | 'dispute';
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

interface NotificationListProps {
  userId: string;
  limit?: number;
}

export function NotificationList({ userId, limit = 20 }: NotificationListProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.link) {
      router.push(notification.link as any);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application': return 'document-text' as const;
      case 'shift': return 'calendar' as const;
      case 'timesheet': return 'time' as const;
      case 'payment': return 'cash' as const;
      case 'dispute': return 'alert-circle' as const;
      default: return 'notifications' as const;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'application': return '#3B82F6';
      case 'shift': return '#8B5CF6';
      case 'timesheet': return '#3B82F6';
      case 'payment': return '#A855F7';
      case 'dispute': return '#7C3AED';
      default: return '#6B7280';
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'application': return '#EFF6FF'; // Light blue
      case 'shift': return '#F3E8FF'; // Light purple
      case 'timesheet': return '#EFF6FF'; // Light green
      case 'payment': return '#F3E8FF'; // Light yellow
      case 'dispute': return '#EDE9FE'; // Light red
      default: return '#F3F4F6'; // Light gray
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="notifications-off-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>No notifications yet</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadNotifications} />
      }
    >
      {notifications.map((notification) => (
        <TouchableOpacity
          key={notification.id}
          onPress={() => handleNotificationPress(notification)}
          activeOpacity={0.7}
        >
          <Card
            mode="elevated"
            style={[
              styles.notificationCard,
              !notification.is_read && styles.unreadCard,
            ]}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.iconContainer}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: getNotificationBgColor(notification.type) },
                  ]}
                >
                  <Ionicons
                    name={getNotificationIcon(notification.type)}
                    size={24}
                    color={getNotificationColor(notification.type)}
                  />
                </View>
                {!notification.is_read && (
                  <View style={styles.unreadDot} />
                )}
              </View>

              <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.time}>
                    {formatTime(notification.created_at)}
                  </Text>
                </View>
                <Text style={styles.message} numberOfLines={2}>
                  {notification.message}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function formatTime(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return time.toLocaleDateString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  notificationCard: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  message: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
