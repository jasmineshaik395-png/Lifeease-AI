import { Task } from '../types';

export type NotificationStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationStatus;
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const perm = await Notification.requestPermission();
    return perm as NotificationStatus;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

export function sendBrowserNotification(title: string, body: string, icon?: string): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
    });
    return true;
  } catch (err) {
    console.error('Error sending notification:', err);
    return false;
  }
}

export interface UpcomingReminder {
  taskId: string;
  taskTitle: string;
  deadline: string;
  isUrgent: boolean;
  priority: string;
}

/**
 * Scans active tasks for deadlines due today or marked urgent
 */
export function getActiveReminders(tasks: Task[]): UpcomingReminder[] {
  return tasks
    .filter((t) => !t.completed && (t.deadline || t.priority === 'high'))
    .map((t) => ({
      taskId: t.id,
      taskTitle: t.title,
      deadline: t.deadline || 'High Priority for today',
      isUrgent: t.priority === 'high',
      priority: t.priority,
    }))
    .slice(0, 5);
}
