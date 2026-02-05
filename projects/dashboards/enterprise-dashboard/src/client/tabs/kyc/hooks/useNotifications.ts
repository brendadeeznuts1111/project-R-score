/**
 * useNotifications - Hook for managing sound and desktop notifications
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { ReviewQueueItem } from "../types";

interface UseNotificationsReturn {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  desktopNotificationsEnabled: boolean;
  setDesktopNotificationsEnabled: (enabled: boolean) => void;
  notificationPermission: NotificationPermission;
  newItemsCount: number;
  showNewItemsBadge: boolean;
  playNotificationSound: () => void;
  showDesktopNotification: (title: string, body: string, count?: number) => void;
}

export function useNotifications(queue: ReviewQueueItem[], loading: boolean): UseNotificationsReturn {
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    const saved = localStorage.getItem('kyc-sound-notifications');
    return saved ? saved === 'true' : false;
  });
  
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabledState] = useState(() => {
    const saved = localStorage.getItem('kyc-desktop-notifications');
    return saved ? saved === 'true' : false;
  });
  
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [newItemsCount, setNewItemsCount] = useState<number>(0);
  const [showNewItemsBadge, setShowNewItemsBadge] = useState<boolean>(false);
  
  const previousQueueCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    localStorage.setItem('kyc-sound-notifications', String(enabled));
  }, []);

  const setDesktopNotificationsEnabled = useCallback((enabled: boolean) => {
    setDesktopNotificationsEnabledState(enabled);
    localStorage.setItem('kyc-desktop-notifications', String(enabled));
  }, []);

  // Request desktop notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default' && desktopNotificationsEnabled) {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
          if (permission === 'granted') {
            localStorage.setItem('kyc-desktop-notifications', 'true');
          }
        });
      }
    }
  }, [desktopNotificationsEnabled]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    
    try {
      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      
      // Check if context is suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {
          // Silently fail if resume is not allowed
          return;
        });
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Create a pleasant notification sound (two-tone chime)
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      // Gracefully handle audio errors (autoplay policy, etc.)
      console.warn('Failed to play notification sound:', error);
    }
  }, [soundEnabled]);

  // Show desktop notification
  const showDesktopNotification = useCallback((title: string, body: string, count?: number) => {
    if (!desktopNotificationsEnabled || notificationPermission !== 'granted') return;
    
    try {
      // Check if Notification API is available
      if (typeof Notification === 'undefined') {
        console.warn('Notification API not available');
        return;
      }
      
      const notification = new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'kyc-review-queue',
        requireInteraction: false,
      });
      
      notification.onclick = () => {
        try {
          window.focus();
          notification.close();
        } catch (error) {
          console.warn('Failed to handle notification click:', error);
        }
      };
      
      notification.onerror = (error) => {
        console.warn('Notification error:', error);
      };
      
      // Auto-close after 5 seconds
      const timeoutId = setTimeout(() => {
        try {
          notification.close();
        } catch (error) {
          // Notification may already be closed
          console.warn('Failed to close notification:', error);
        }
      }, 5000);
      
      // Clean up timeout if notification is closed manually
      notification.addEventListener('close', () => {
        clearTimeout(timeoutId);
      });
    } catch (error) {
      // Gracefully handle notification errors (permission denied, etc.)
      console.warn('Failed to show desktop notification:', error);
    }
  }, [desktopNotificationsEnabled, notificationPermission]);

  // Detect new items and trigger notifications
  useEffect(() => {
    if (loading || queue.length === 0) {
      previousQueueCountRef.current = queue.length;
      return;
    }

    const currentPendingCount = queue.filter(item => item.status === 'pending').length;
    const previousPendingCount = previousQueueCountRef.current;
    
    if (currentPendingCount > previousPendingCount) {
      const newItems = currentPendingCount - previousPendingCount;
      
      // Update badge
      setNewItemsCount(newItems);
      setShowNewItemsBadge(true);
      
      // Play sound notification
      playNotificationSound();
      
      // Show desktop notification
      showDesktopNotification(
        'New KYC Review Items',
        `${newItems} new item${newItems > 1 ? 's' : ''} added to review queue`,
        newItems
      );
      
      // Auto-hide badge after 10 seconds
      setTimeout(() => {
        setShowNewItemsBadge(false);
        setNewItemsCount(0);
      }, 10000);
    }
    
    previousQueueCountRef.current = currentPendingCount;
  }, [queue, loading, playNotificationSound, showDesktopNotification]);

  return {
    soundEnabled,
    setSoundEnabled,
    desktopNotificationsEnabled,
    setDesktopNotificationsEnabled,
    notificationPermission,
    newItemsCount,
    showNewItemsBadge,
    playNotificationSound,
    showDesktopNotification,
  };
}
