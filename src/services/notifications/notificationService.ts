import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MaintenanceTask } from '../../types';
import { addDays, parseISO, differenceInDays, format } from 'date-fns';
import { formatCurrency } from '../../utils/currency';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ScheduledNotification {
  id: string;
  taskId: string;
  title: string;
  body: string;
  scheduledFor: Date;
}

class NotificationService {
  private initialized = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return false;
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('maintenance', {
          name: 'Maintenance Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#22c55e',
        });

        await Notifications.setNotificationChannelAsync('bills', {
          name: 'Bill Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
        });
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async scheduleMaintenanceReminder(task: MaintenanceTask): Promise<string | null> {
    try {
      const nextDueDate = parseISO(task.nextDueDate);
      const reminderDate = addDays(nextDueDate, -task.reminderDaysBefore);

      // Don't schedule if the reminder date is in the past
      if (reminderDate <= new Date()) {
        return null;
      }

      // Cancel any existing notification for this task
      await this.cancelNotification(`maintenance-${task.id}`);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Maintenance Reminder',
          body: `${task.title} is due ${task.reminderDaysBefore === 0 ? 'today' : `in ${task.reminderDaysBefore} days`}`,
          data: {
            type: 'maintenance',
            taskId: task.id,
          },
          sound: true,
        },
        trigger: {
          date: reminderDate,
          channelId: 'maintenance',
        },
        identifier: `maintenance-${task.id}`,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule maintenance reminder:', error);
      return null;
    }
  }

  async scheduleBillReminder(
    billName: string,
    dueDate: Date,
    amount: number,
    reminderDaysBefore: number = 3,
    billId: string
  ): Promise<string | null> {
    try {
      const reminderDate = addDays(dueDate, -reminderDaysBefore);

      if (reminderDate <= new Date()) {
        return null;
      }

      await this.cancelNotification(`bill-${billId}`);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Bill Reminder',
          body: `${billName} (${formatCurrency(amount)}) is due ${format(dueDate, 'MMM d')}`,
          data: {
            type: 'bill',
            billId,
          },
          sound: true,
        },
        trigger: {
          date: reminderDate,
          channelId: 'bills',
        },
        identifier: `bill-${billId}`,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule bill reminder:', error);
      return null;
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      // Notification might not exist, which is fine
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  async scheduleMultipleMaintenanceReminders(tasks: MaintenanceTask[]): Promise<void> {
    for (const task of tasks) {
      // Only schedule reminders for active tasks that are not completed
      if (task.isActive && !task.isCompleted) {
        await this.scheduleMaintenanceReminder(task);
      }
    }
  }

  // Reschedule all notifications for active maintenance tasks
  async syncMaintenanceNotifications(tasks: MaintenanceTask[]): Promise<void> {
    // Cancel all existing maintenance notifications
    const scheduled = await this.getScheduledNotifications();
    for (const notification of scheduled) {
      if (notification.identifier.startsWith('maintenance-')) {
        await this.cancelNotification(notification.identifier);
      }
    }

    // Schedule new ones
    await this.scheduleMultipleMaintenanceReminders(tasks);
  }

  // Get upcoming notifications summary
  async getUpcomingReminders(): Promise<{ maintenance: number; bills: number }> {
    const scheduled = await this.getScheduledNotifications();
    let maintenance = 0;
    let bills = 0;

    for (const notification of scheduled) {
      if (notification.identifier.startsWith('maintenance-')) {
        maintenance++;
      } else if (notification.identifier.startsWith('bill-')) {
        bills++;
      }
    }

    return { maintenance, bills };
  }

  // Register notification listeners
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseReceivedListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.EventSubscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export const notificationService = new NotificationService();
