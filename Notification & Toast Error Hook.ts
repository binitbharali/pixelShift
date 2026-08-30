import { useState, useCallback } from 'react';
import { normalizeError, STANDARD_ERROR_MESSAGE } from '../utils/errorHandler';

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  details?: string;
  durationMs?: number;
}

export function useNotification() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notifyError = useCallback((error: unknown, customDuration = 4000) => {
    const normalized = normalizeError(error, STANDARD_ERROR_MESSAGE);
    const id = `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newItem: NotificationItem = {
      id,
      type: 'error',
      message: normalized.userMessage,
      details: normalized.technicalDetails,
      durationMs: customDuration,
    };

    setNotifications((prev) => [...prev, newItem]);

    if (customDuration > 0) {
      setTimeout(() => removeNotification(id), customDuration);
    }
  }, [removeNotification]);

  const notifySuccess = useCallback((message: string, customDuration = 3000) => {
    const id = `succ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newItem: NotificationItem = {
      id,
      type: 'success',
      message,
      durationMs: customDuration,
    };

    setNotifications((prev) => [...prev, newItem]);

    if (customDuration > 0) {
      setTimeout(() => removeNotification(id), customDuration);
    }
  }, [removeNotification]);

  return {
    notifications,
    notifyError,
    notifySuccess,
    removeNotification,
  };
}