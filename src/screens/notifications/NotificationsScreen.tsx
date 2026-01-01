import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Bell,
  Wrench,
  AlertTriangle,
  Clock,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Package,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { MaintenanceTask, Asset } from '../../types';
import { maintenanceRepository, assetRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, EmptyState, Badge } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { formatDate, formatRelative } from '../../utils/date';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NotificationItem {
  id: string;
  type: 'maintenance_due' | 'maintenance_overdue' | 'warranty_expiring';
  title: string;
  description: string;
  date: string;
  propertyId?: string;
  propertyName?: string;
  priority: 'high' | 'medium' | 'low';
  actionRoute?: keyof RootStackParamList;
  actionParams?: object;
}

export function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const properties = await propertyRepository.getAll();
      const allNotifications: NotificationItem[] = [];

      for (const property of properties) {
        // Get maintenance tasks
        const tasks = await maintenanceRepository.getByPropertyId(property.id);
        const now = new Date();

        for (const task of tasks) {
          if (task.isCompleted) continue;

          const dueDate = new Date(task.nextDueDate);
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilDue < 0) {
            // Overdue
            allNotifications.push({
              id: `task-${task.id}`,
              type: 'maintenance_overdue',
              title: task.title,
              description: `Overdue by ${Math.abs(daysUntilDue)} days`,
              date: task.nextDueDate,
              propertyId: property.id,
              propertyName: property.name,
              priority: 'high',
              actionRoute: 'Maintenance',
              actionParams: { propertyId: property.id },
            });
          } else if (daysUntilDue <= task.reminderDaysBefore) {
            // Due soon
            allNotifications.push({
              id: `task-${task.id}`,
              type: 'maintenance_due',
              title: task.title,
              description: daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} days`,
              date: task.nextDueDate,
              propertyId: property.id,
              propertyName: property.name,
              priority: daysUntilDue <= 3 ? 'high' : 'medium',
              actionRoute: 'Maintenance',
              actionParams: { propertyId: property.id },
            });
          }
        }

        // Get assets with expiring warranties
        const assets = await assetRepository.getByPropertyId(property.id);
        for (const asset of assets) {
          if (!asset.warrantyEndDate) continue;

          const warrantyDate = new Date(asset.warrantyEndDate);
          const daysUntilExpiry = Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
            allNotifications.push({
              id: `warranty-${asset.id}`,
              type: 'warranty_expiring',
              title: `${asset.name} warranty`,
              description: daysUntilExpiry === 0 ? 'Expires today' : `Expires in ${daysUntilExpiry} days`,
              date: asset.warrantyEndDate,
              propertyId: property.id,
              propertyName: property.name,
              priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
              actionRoute: 'AssetDetail',
              actionParams: { assetId: asset.id },
            });
          }
        }
      }

      // Sort by priority and date
      allNotifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = (notification: NotificationItem) => {
    if (notification.actionRoute && notification.actionParams) {
      navigation.navigate(notification.actionRoute as any, notification.actionParams as any);
    }
  };

  const getNotificationIcon = (type: NotificationItem['type'], priority: NotificationItem['priority']) => {
    switch (type) {
      case 'maintenance_overdue':
        return <AlertTriangle size={20} color={COLORS.error} />;
      case 'maintenance_due':
        return <Wrench size={20} color={priority === 'high' ? COLORS.warning : COLORS.info} />;
      case 'warranty_expiring':
        return <Package size={20} color={COLORS.secondary[600]} />;
      default:
        return <Bell size={20} color={COLORS.slate[500]} />;
    }
  };

  const getNotificationBgColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'maintenance_overdue':
        return isDark ? 'bg-red-900/30' : 'bg-red-50';
      case 'maintenance_due':
        return isDark ? 'bg-amber-900/30' : 'bg-amber-50';
      case 'warranty_expiring':
        return isDark ? 'bg-orange-900/30' : 'bg-orange-50';
      default:
        return isDark ? 'bg-slate-800' : 'bg-slate-50';
    }
  };

  const highPriorityCount = notifications.filter(n => n.priority === 'high').length;

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('notifications.title')}
        subtitle={notifications.length > 0 ? `${notifications.length} ${t('common.pending')}` : undefined}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {notifications.length === 0 && !loading ? (
          <View className="flex-1 pt-16 px-8">
            <EmptyState
              icon={<CheckCircle2 size={44} color={COLORS.primary[500]} />}
              title={t('notifications.empty')}
              description={t('common.noPendingNotifications')}
            />
          </View>
        ) : (
          <View className="px-5 pt-4 pb-8">
            {/* Summary Card */}
            {highPriorityCount > 0 && (
              <Card
                variant="filled"
                padding="md"
                className={`mb-4 ${isDark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-100'} border`}
              >
                <View className="flex-row items-center">
                  <View className={`w-10 h-10 rounded-xl ${isDark ? 'bg-red-900/50' : 'bg-red-100'} items-center justify-center`}>
                    <AlertTriangle size={20} color={COLORS.error} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className={`text-base font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                      {highPriorityCount} {t('common.urgent')} {highPriorityCount === 1 ? t('common.item') : t('common.items')}
                    </Text>
                    <Text className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                      {t('common.requiresAttention')}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            {/* Notifications List */}
            <View className="gap-3">
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <Card variant="default" padding="md" className={getNotificationBgColor(notification.type)}>
                    <View className="flex-row items-start">
                      <View
                        className={`w-10 h-10 rounded-xl items-center justify-center ${
                          isDark ? 'bg-slate-700' : 'bg-white'
                        }`}
                      >
                        {getNotificationIcon(notification.type, notification.priority)}
                      </View>
                      <View className="flex-1 ml-3">
                        <View className="flex-row items-center justify-between">
                          <Text
                            className={`text-base font-semibold flex-1 ${isDark ? 'text-white' : 'text-slate-900'}`}
                            numberOfLines={1}
                          >
                            {notification.title}
                          </Text>
                          {notification.priority === 'high' && (
                            <Badge label="Urgent" variant="error" size="sm" />
                          )}
                        </View>
                        <Text className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {notification.description}
                        </Text>
                        <View className="flex-row items-center mt-2">
                          <Calendar size={12} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                          <Text className={`text-xs ml-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            {formatDate(notification.date, 'MMM d, yyyy')}
                          </Text>
                          {notification.propertyName && (
                            <>
                              <Text className={`text-xs mx-1.5 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>
                                |
                              </Text>
                              <Text className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                {notification.propertyName}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      <ChevronRight size={18} color={isDark ? COLORS.slate[600] : COLORS.slate[400]} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
