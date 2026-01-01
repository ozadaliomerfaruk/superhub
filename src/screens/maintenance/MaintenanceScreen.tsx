import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Settings,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Edit3,
  X,
  Bell,
  User,
  History,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { MaintenanceTaskWithWorker, MaintenanceCompletionWithWorker, Worker, Property } from '../../types';
import { maintenanceRepository, maintenanceCompletionRepository, propertyRepository, workerRepository } from '../../services/database';
import { notificationService } from '../../services/notifications';
import { ScreenHeader, Card, Button, Badge, Input } from '../../components/ui';
import { COLORS, MAINTENANCE_TEMPLATES } from '../../constants/theme';
import { formatDate, formatRelative, getCurrentISODate } from '../../utils/date';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MaintenanceRouteProp = RouteProp<RootStackParamList, 'Maintenance'>;

type TaskStatus = 'overdue' | 'due_soon' | 'upcoming' | 'completed';

function getTaskStatus(task: MaintenanceTaskWithWorker): TaskStatus {
  if (task.isCompleted) return 'completed';

  const now = new Date();
  const dueDate = new Date(task.nextDueDate);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= task.reminderDaysBefore) return 'due_soon';
  return 'upcoming';
}

const STATUS_CONFIG: Record<TaskStatus, { color: string; bgColor: string }> = {
  overdue: { color: COLORS.error, bgColor: '#fef2f2' },
  due_soon: { color: COLORS.warning, bgColor: '#fffbeb' },
  upcoming: { color: COLORS.info, bgColor: '#eff6ff' },
  completed: { color: COLORS.success, bgColor: '#f0fdf4' },
};

export function MaintenanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<MaintenanceRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();
  const { t } = useTranslation();

  // Helper functions for translations
  const getStatusLabel = (status: TaskStatus): string => {
    const statusMap: Record<TaskStatus, string> = {
      overdue: t('maintenance.status.overdue'),
      due_soon: t('maintenance.status.dueSoon'),
      upcoming: t('maintenance.status.upcoming'),
      completed: t('maintenance.status.completed'),
    };
    return statusMap[status];
  };

  const getFrequencyLabel = (frequency: string): string => {
    const frequencyMap: Record<string, string> = {
      once: t('maintenance.frequency_options.once'),
      weekly: t('maintenance.frequency_options.weekly'),
      monthly: t('maintenance.frequency_options.monthly'),
      quarterly: t('maintenance.frequency_options.quarterly'),
      biannual: t('maintenance.frequency_options.biannual'),
      yearly: t('maintenance.frequency_options.yearly'),
    };
    return frequencyMap[frequency] || frequency;
  };

  const [property, setProperty] = useState<Property | null>(null);
  const [tasks, setTasks] = useState<MaintenanceTaskWithWorker[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Task form state
  const [editingTask, setEditingTask] = useState<MaintenanceTaskWithWorker | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskFrequency, setTaskFrequency] = useState<MaintenanceTaskWithWorker['frequency']>('once');
  const [taskDueDate, setTaskDueDate] = useState(new Date());
  const [tempTaskDueDate, setTempTaskDueDate] = useState(new Date());
  const [taskReminderDays, setTaskReminderDays] = useState(3);
  const [taskAssignedWorkerId, setTaskAssignedWorkerId] = useState<string | undefined>(undefined);

  // Completion form state
  const [completingTask, setCompletingTask] = useState<MaintenanceTaskWithWorker | null>(null);
  const [completionWorkerId, setCompletionWorkerId] = useState<string | undefined>(undefined);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionCost, setCompletionCost] = useState('');

  // History state
  const [historyTask, setHistoryTask] = useState<MaintenanceTaskWithWorker | null>(null);
  const [taskCompletions, setTaskCompletions] = useState<MaintenanceCompletionWithWorker[]>([]);

  const isEditing = editingTask !== null;

  const loadData = useCallback(async () => {
    try {
      const [propertyData, taskData, workerData] = await Promise.all([
        propertyRepository.getById(propertyId),
        maintenanceRepository.getByPropertyId(propertyId),
        workerRepository.getAll(),
      ]);
      setProperty(propertyData);
      setTasks(taskData);
      setWorkers(workerData);

      // Sync notifications for active tasks
      const activeTasks = taskData.filter((t) => !t.isCompleted);
      await notificationService.syncMaintenanceNotifications(activeTasks);
    } catch (error) {
      console.error('Failed to load maintenance data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Open completion modal instead of directly marking complete
  const handleOpenCompleteModal = (task: MaintenanceTaskWithWorker) => {
    setCompletingTask(task);
    setCompletionWorkerId(task.assignedWorkerId);
    setCompletionNotes('');
    setCompletionCost('');
    setShowCompleteModal(true);
  };

  const handleCompleteTask = async () => {
    if (!completingTask) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Create completion record
      await maintenanceCompletionRepository.create({
        taskId: completingTask.id,
        workerId: completionWorkerId,
        completedDate: getCurrentISODate(),
        notes: completionNotes || undefined,
        cost: completionCost ? parseFloat(completionCost) : undefined,
      });

      // Mark task complete (this will reschedule if recurring)
      await maintenanceRepository.markComplete(completingTask.id);

      setShowCompleteModal(false);
      setCompletingTask(null);
      loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to complete task:', error);
      Alert.alert(t('common.error'), t('common.errorMessage'));
    }
  };

  const handleViewHistory = async (task: MaintenanceTaskWithWorker) => {
    setHistoryTask(task);
    try {
      const completions = await maintenanceCompletionRepository.getByTaskId(task.id);
      setTaskCompletions(completions);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Failed to load task history:', error);
      Alert.alert(t('common.error'), t('common.errorMessage'));
    }
  };

  const handleDeleteTask = (task: MaintenanceTaskWithWorker) => {
    Alert.alert(
      t('maintenance.delete'),
      `${t('maintenance.deleteConfirm')} "${task.title}"? ${t('maintenance.deleteWarning')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await maintenanceRepository.delete(task.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete task:', error);
              Alert.alert(t('common.error'), t('common.errorMessage'));
            }
          },
        },
      ]
    );
  };

  const getTemplateTitle = (key: string): string => {
    return t(`maintenance.templates.${key}`);
  };

  const handleAddTemplate = (template: typeof MAINTENANCE_TEMPLATES[number]) => {
    setEditingTask(null);
    setTaskTitle(getTemplateTitle(template.key));
    const freq = template.frequency as MaintenanceTaskWithWorker['frequency'];
    setTaskFrequency(freq);
    setTaskReminderDays(template.reminderDaysBefore);
    setTaskAssignedWorkerId(undefined);

    const dueDate = new Date();
    switch (freq) {
      case 'weekly':
        dueDate.setDate(dueDate.getDate() + 7);
        break;
      case 'monthly':
        dueDate.setMonth(dueDate.getMonth() + 1);
        break;
      case 'quarterly':
        dueDate.setMonth(dueDate.getMonth() + 3);
        break;
      case 'biannual':
        dueDate.setMonth(dueDate.getMonth() + 6);
        break;
      case 'yearly':
        dueDate.setFullYear(dueDate.getFullYear() + 1);
        break;
      default:
        break;
    }
    setTaskDueDate(dueDate);
    setShowTemplates(false);
    setShowTaskModal(true);
  };

  const handleAddCustomTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskFrequency('once');
    setTaskDueDate(new Date());
    setTaskReminderDays(3);
    setTaskAssignedWorkerId(undefined);
    setShowTemplates(false);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: MaintenanceTaskWithWorker) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskFrequency(task.frequency);
    setTaskDueDate(new Date(task.nextDueDate));
    setTaskReminderDays(task.reminderDaysBefore);
    setTaskAssignedWorkerId(task.assignedWorkerId);
    setShowTaskModal(true);
  };

  const resetTaskForm = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskFrequency('once');
    setTaskDueDate(new Date());
    setTaskReminderDays(3);
    setTaskAssignedWorkerId(undefined);
  };

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      Alert.alert(t('common.error'), t('maintenance.taskNameRequired'));
      return;
    }

    try {
      if (isEditing && editingTask) {
        await maintenanceRepository.update(editingTask.id, {
          title: taskTitle.trim(),
          frequency: taskFrequency,
          nextDueDate: taskDueDate.toISOString(),
          reminderDaysBefore: taskReminderDays,
          assignedWorkerId: taskAssignedWorkerId,
        });
      } else {
        await maintenanceRepository.create({
          propertyId,
          title: taskTitle.trim(),
          frequency: taskFrequency,
          nextDueDate: taskDueDate.toISOString(),
          reminderDaysBefore: taskReminderDays,
          assignedWorkerId: taskAssignedWorkerId,
        });
      }

      setShowTaskModal(false);
      resetTaskForm();
      loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save task:', error);
      Alert.alert(t('common.error'), t('common.errorMessage'));
    }
  };

  const getDueDateText = (task: MaintenanceTaskWithWorker): string => {
    const now = new Date();
    const dueDate = new Date(task.nextDueDate);
    const days = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return t('maintenance.dueText.overdue', { days: Math.abs(days) });
    if (days === 0) return t('maintenance.dueText.today');
    if (days === 1) return t('maintenance.dueText.tomorrow');
    return t('maintenance.dueText.inDays', { days });
  };

  const frequencyOptions: { label: string; value: MaintenanceTaskWithWorker['frequency']; description: string }[] = [
    { label: t('maintenance.frequency_options.once'), value: 'once', description: t('maintenance.frequency_descriptions.once') },
    { label: t('maintenance.frequency_options.weekly'), value: 'weekly', description: t('maintenance.frequency_descriptions.weekly') },
    { label: t('maintenance.frequency_options.monthly'), value: 'monthly', description: t('maintenance.frequency_descriptions.monthly') },
    { label: t('maintenance.frequency_options.quarterly'), value: 'quarterly', description: t('maintenance.frequency_descriptions.quarterly') },
    { label: t('maintenance.frequency_options.biannual'), value: 'biannual', description: t('maintenance.frequency_descriptions.biannual') },
    { label: t('maintenance.frequency_options.yearly'), value: 'yearly', description: t('maintenance.frequency_descriptions.yearly') },
  ];

  const reminderOptions = [
    { label: t('maintenance.reminderOptions.sameDay'), value: 0 },
    { label: t('maintenance.reminderOptions.oneDayBefore'), value: 1 },
    { label: t('maintenance.reminderOptions.threeDaysBefore'), value: 3 },
    { label: t('maintenance.reminderOptions.oneWeekBefore'), value: 7 },
    { label: t('maintenance.reminderOptions.twoWeeksBefore'), value: 14 },
    { label: t('maintenance.reminderOptions.oneMonthBefore'), value: 30 },
  ];

  const groupedTasks = tasks.reduce((acc, task) => {
    const status = getTaskStatus(task);
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {} as Record<TaskStatus, MaintenanceTaskWithWorker[]>);

  const statusOrder: TaskStatus[] = ['overdue', 'due_soon', 'upcoming', 'completed'];
  const overdueCount = groupedTasks.overdue?.length || 0;
  const dueSoonCount = groupedTasks.due_soon?.length || 0;
  const completedCount = groupedTasks.completed?.length || 0;

  const getWorkerName = (workerId?: string) => {
    if (!workerId) return null;
    return workers.find(w => w.id === workerId)?.name;
  };

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('maintenance.tasks')}
        subtitle={property?.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => setShowTemplates(!showTemplates)}
            className="w-10 h-10 rounded-xl bg-primary-500 items-center justify-center"
            activeOpacity={0.7}
          >
            <Plus size={22} color="#ffffff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary[600]} />
        }
      >
        {/* Stats Row */}
        <View className="flex-row px-5 pt-5 gap-3">
          <Card variant="default" padding="md" className="flex-1">
            <View className="items-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mb-2 ${isDark ? 'bg-red-900/40' : 'bg-red-100'}`}>
                <AlertTriangle size={20} color={COLORS.error} />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{overdueCount}</Text>
              <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('maintenance.status.overdue')}</Text>
            </View>
          </Card>
          <Card variant="default" padding="md" className="flex-1">
            <View className="items-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mb-2 ${isDark ? 'bg-amber-900/40' : 'bg-amber-100'}`}>
                <Clock size={20} color={COLORS.warning} />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{dueSoonCount}</Text>
              <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('maintenance.status.dueSoon')}</Text>
            </View>
          </Card>
          <Card variant="default" padding="md" className="flex-1">
            <View className="items-center">
              <View className={`w-10 h-10 rounded-xl items-center justify-center mb-2 ${isDark ? 'bg-green-900/40' : 'bg-green-100'}`}>
                <CheckCircle2 size={20} color={COLORS.success} />
              </View>
              <Text className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{completedCount}</Text>
              <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('maintenance.status.completed')}</Text>
            </View>
          </Card>
        </View>

        {/* Templates Panel */}
        {showTemplates && (
          <View className="px-5 mt-4">
            <Card variant="filled" padding="md" className={`border ${isDark ? 'bg-primary-900/30 border-primary-800' : 'bg-primary-50 border-primary-100'}`}>
              <Text className={`text-sm font-semibold mb-3 ${isDark ? 'text-primary-400' : 'text-primary-700'}`}>{t('maintenance.templates.title')}</Text>
              <View className="gap-2">
                {MAINTENANCE_TEMPLATES.map((template, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleAddTemplate(template)}
                    className={`flex-row items-center justify-between rounded-lg px-3 py-2.5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-primary-100'}`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-1">
                      <Text className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{getTemplateTitle(template.key)}</Text>
                      <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getFrequencyLabel(template.frequency)}</Text>
                    </View>
                    <Plus size={18} color={COLORS.primary[isDark ? 400 : 600]} />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={handleAddCustomTask}
                className={`flex-row items-center justify-center mt-3 py-2.5 border border-dashed rounded-lg ${isDark ? 'border-primary-700' : 'border-primary-300'}`}
                activeOpacity={0.7}
              >
                <Plus size={16} color={COLORS.primary[isDark ? 400 : 600]} />
                <Text className={`text-sm font-medium ml-1.5 ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{t('maintenance.templates.custom')}</Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className="w-16 h-16 rounded-2xl bg-slate-200 items-center justify-center mb-4">
                  <Settings size={32} color={COLORS.slate[400]} />
                </View>
                <Text className="text-lg font-semibold text-slate-700 text-center">{t('maintenance.noTasks')}</Text>
                <Text className="text-sm text-slate-500 text-center mt-2 px-4">
                  {t('maintenance.noTasksDesc')}
                </Text>
                <Button
                  title={t('maintenance.add')}
                  onPress={() => setShowTemplates(true)}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-4 pb-8">
            {statusOrder.map((status) => {
              const statusTasks = groupedTasks[status];
              if (!statusTasks || statusTasks.length === 0) return null;
              const config = STATUS_CONFIG[status];

              return (
                <View key={status}>
                  <View className="flex-row items-center mb-2">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: config.color }} />
                    <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                      {getStatusLabel(status)} ({statusTasks.length})
                    </Text>
                  </View>

                  <View className="gap-2">
                    {statusTasks.map((task) => {
                      const taskStatus = getTaskStatus(task);
                      const statusConfig = STATUS_CONFIG[taskStatus];
                      const isExpanded = expandedTaskId === task.id;

                      return (
                        <Card key={task.id} variant="default" padding="none">
                          <View className="h-1 rounded-t-xl" style={{ backgroundColor: statusConfig.color }} />
                          <TouchableOpacity
                            onPress={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            activeOpacity={0.7}
                            className="p-4"
                          >
                            <View className="flex-row items-start">
                              {/* Status indicator */}
                              <View className="mt-0.5">
                                {task.isCompleted ? (
                                  <CheckCircle2 size={26} color={COLORS.success} fill={COLORS.success} />
                                ) : (
                                  <View
                                    className="w-[26px] h-[26px] rounded-full border-2"
                                    style={{ borderColor: statusConfig.color }}
                                  />
                                )}
                              </View>

                              <View className="flex-1 ml-3">
                                <Text
                                  className={`text-base font-semibold ${
                                    task.isCompleted ? 'text-slate-400' : 'text-slate-900'
                                  }`}
                                >
                                  {task.title}
                                </Text>

                                {/* Worker & Status Info */}
                                <View className="flex-row flex-wrap items-center gap-2 mt-2">
                                  <Badge label={getFrequencyLabel(task.frequency)} variant="default" size="sm" />

                                  {task.isCompleted ? (
                                    <View className="flex-row items-center bg-green-50 px-2 py-1 rounded-lg">
                                      <CheckCircle2 size={12} color={COLORS.success} />
                                      <Text className="text-xs text-green-700 ml-1 font-medium">
                                        Done {formatRelative(task.lastCompletedDate!)}
                                      </Text>
                                    </View>
                                  ) : (
                                    <View
                                      className="flex-row items-center px-2 py-1 rounded-lg"
                                      style={{ backgroundColor: statusConfig.bgColor }}
                                    >
                                      <Calendar size={12} color={statusConfig.color} />
                                      <Text className="text-xs ml-1 font-medium" style={{ color: statusConfig.color }}>
                                        {getDueDateText(task)}
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                {/* Last completed by worker */}
                                {task.lastCompletionWorkerName && (
                                  <View className="flex-row items-center mt-2">
                                    <User size={11} color={COLORS.slate[400]} />
                                    <Text className="text-xs text-slate-400 ml-1">
                                      {t('maintenance.lastDoneBy')} {task.lastCompletionWorkerName}
                                    </Text>
                                  </View>
                                )}

                                {/* Assigned worker */}
                                {task.assignedWorkerName && !task.isCompleted && (
                                  <View className="flex-row items-center mt-1">
                                    <User size={11} color={COLORS.primary[400]} />
                                    <Text className="text-xs text-primary-500 ml-1">
                                      {t('maintenance.assignedTo')} {task.assignedWorkerName}
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Expand/Collapse */}
                              <View className="ml-2">
                                {isExpanded ? (
                                  <ChevronUp size={20} color={COLORS.slate[400]} />
                                ) : (
                                  <ChevronDown size={20} color={COLORS.slate[400]} />
                                )}
                              </View>
                            </View>

                            {/* Expanded Actions */}
                            {isExpanded && (
                              <View className="mt-4 pt-3 border-t border-slate-100">
                                <View className="flex-row gap-2">
                                  {!task.isCompleted && (
                                    <TouchableOpacity
                                      onPress={() => handleOpenCompleteModal(task)}
                                      className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center"
                                      style={{ backgroundColor: statusConfig.bgColor }}
                                      activeOpacity={0.7}
                                    >
                                      <CheckCircle2 size={16} color={statusConfig.color} />
                                      <Text className="text-sm font-semibold ml-1.5" style={{ color: statusConfig.color }}>
                                        {t('maintenance.complete')}
                                      </Text>
                                    </TouchableOpacity>
                                  )}

                                  <TouchableOpacity
                                    onPress={() => handleViewHistory(task)}
                                    className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center bg-slate-100"
                                    activeOpacity={0.7}
                                  >
                                    <History size={16} color={COLORS.slate[600]} />
                                    <Text className="text-sm font-semibold ml-1.5 text-slate-600">{t('maintenance.history')}</Text>
                                  </TouchableOpacity>
                                </View>

                                <View className="flex-row gap-2 mt-2">
                                  <TouchableOpacity
                                    onPress={() => handleEditTask(task)}
                                    className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center bg-slate-100"
                                    activeOpacity={0.7}
                                  >
                                    <Edit3 size={16} color={COLORS.slate[600]} />
                                    <Text className="text-sm font-semibold ml-1.5 text-slate-600">{t('maintenance.edit')}</Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    onPress={() => handleDeleteTask(task)}
                                    className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center bg-red-50"
                                    activeOpacity={0.7}
                                  >
                                    <Trash2 size={16} color={COLORS.error} />
                                    <Text className="text-sm font-semibold ml-1.5 text-red-600">{t('common.delete')}</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </TouchableOpacity>
                        </Card>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Task Modal */}
      <Modal
        visible={showTaskModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowTaskModal(false);
          resetTaskForm();
        }}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <TouchableOpacity
              onPress={() => {
                setShowTaskModal(false);
                resetTaskForm();
              }}
              className="p-2"
            >
              <X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{isEditing ? t('maintenance.edit') : t('maintenance.add')}</Text>
            <Button title={t('common.save')} variant="primary" size="sm" onPress={handleSaveTask} />
          </View>

          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            {/* Task Name */}
            <View className="mb-5">
              <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('maintenance.taskName')} *</Text>
              <Input placeholder={t('maintenance.taskNamePlaceholder')} value={taskTitle} onChangeText={setTaskTitle} />
            </View>

            {/* Due Date */}
            <View className="mb-5">
              <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('maintenance.dueDate')} *</Text>
              <TouchableOpacity
                onPress={() => {
                  setTempTaskDueDate(taskDueDate);
                  setShowDatePicker(true);
                }}
                activeOpacity={0.7}
                className={`rounded-xl px-4 py-3.5 border flex-row items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
              >
                <Calendar size={18} color={COLORS.primary[500]} />
                <Text className={`text-base ml-3 flex-1 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                  {formatDate(taskDueDate.toISOString(), 'EEEE, MMMM d, yyyy')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Assigned Worker */}
            <View className="mb-5">
              <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('maintenance.assignTo')}</Text>
              <TouchableOpacity
                onPress={() => setShowWorkerPicker(true)}
                activeOpacity={0.7}
                className={`rounded-xl px-4 py-3.5 border flex-row items-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
              >
                <User size={18} color={COLORS.slate[400]} />
                <Text className={`text-base ml-3 flex-1 ${taskAssignedWorkerId ? (isDark ? 'text-slate-200' : 'text-slate-700') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                  {getWorkerName(taskAssignedWorkerId) || t('maintenance.selectWorker')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Frequency */}
            <View className="mb-5">
              <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('maintenance.frequency')}</Text>
              <View className="gap-2">
                {frequencyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setTaskFrequency(option.value)}
                    activeOpacity={0.7}
                    className={`flex-row items-center px-4 py-3 rounded-xl border-2 ${
                      taskFrequency === option.value
                        ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                        : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex-1">
                      <Text className={`text-base font-medium ${taskFrequency === option.value ? 'text-primary-700' : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                        {option.label}
                      </Text>
                      <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{option.description}</Text>
                    </View>
                    {taskFrequency === option.value && <CheckCircle2 size={20} color={COLORS.primary[500]} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reminder */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <Bell size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                <Text className={`text-sm font-semibold ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('maintenance.remindMe')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {reminderOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => setTaskReminderDays(option.value)}
                      activeOpacity={0.7}
                      className={`px-4 py-2.5 rounded-xl border-2 ${
                        taskReminderDays === option.value
                          ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                          : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${taskReminderDays === option.value ? 'text-primary-700' : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {taskFrequency !== 'once' && (
              <View className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                <Text className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                  {t('maintenance.recurringInfo')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Date Picker Modal */}
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View className="flex-1 justify-end bg-black/50">
            <View className={`rounded-t-3xl ${isDark ? 'bg-slate-800' : 'bg-white'}`}>
              <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text className={`text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('maintenance.dueDate')}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setTaskDueDate(tempTaskDueDate);
                    setShowDatePicker(false);
                  }}
                >
                  <Text className="text-base font-semibold text-primary-600">{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTaskDueDate}
                mode="date"
                display="spinner"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  if (selectedDate) setTempTaskDueDate(selectedDate);
                }}
                style={{ height: 200 }}
                textColor={isDark ? '#fff' : undefined}
              />
            </View>
          </View>
        </Modal>
      </Modal>

      {/* Worker Picker Modal */}
      <Modal
        visible={showWorkerPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWorkerPicker(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowWorkerPicker(false)} className="p-2">
              <X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('maintenance.selectWorker')}</Text>
            <View className="w-10" />
          </View>

          <ScrollView className="flex-1 px-5 py-4">
            <TouchableOpacity
              onPress={() => {
                setTaskAssignedWorkerId(undefined);
                setShowWorkerPicker(false);
              }}
              className={`flex-row items-center px-4 py-3 rounded-xl border-2 mb-2 ${
                !taskAssignedWorkerId
                  ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                  : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`text-base font-medium ${!taskAssignedWorkerId ? 'text-primary-700' : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                {t('maintenance.noWorkerAssigned')}
              </Text>
            </TouchableOpacity>

            {workers.map((worker) => (
              <TouchableOpacity
                key={worker.id}
                onPress={() => {
                  setTaskAssignedWorkerId(worker.id);
                  setShowWorkerPicker(false);
                }}
                className={`flex-row items-center px-4 py-3 rounded-xl border-2 mb-2 ${
                  taskAssignedWorkerId === worker.id
                    ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                    : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                }`}
                activeOpacity={0.7}
              >
                <User size={20} color={taskAssignedWorkerId === worker.id ? COLORS.primary[500] : COLORS.slate[400]} />
                <View className="flex-1 ml-3">
                  <Text className={`text-base font-medium ${taskAssignedWorkerId === worker.id ? 'text-primary-700' : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                    {worker.name}
                  </Text>
                  {worker.specialty.length > 0 && (
                    <Text className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{worker.specialty.join(', ')}</Text>
                  )}
                </View>
                {taskAssignedWorkerId === worker.id && <CheckCircle2 size={20} color={COLORS.primary[500]} />}
              </TouchableOpacity>
            ))}

            {workers.length === 0 && (
              <View className="items-center py-8">
                <Text className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('maintenance.noWorkers')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Complete Task Modal */}
      <Modal
        visible={showCompleteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowCompleteModal(false)} className="p-2">
              <X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('maintenance.complete')}</Text>
            <Button title={t('common.done')} variant="primary" size="sm" onPress={handleCompleteTask} />
          </View>

          <ScrollView className="flex-1 px-5 py-4">
            {completingTask && (
              <View className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{completingTask.title}</Text>
                <Text className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formatDate(getCurrentISODate(), 'MMMM d, yyyy')}</Text>
              </View>
            )}

            {/* Worker Selection */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <User size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                <Text className={`text-sm font-semibold ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('maintenance.whoDidWork')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setCompletionWorkerId(undefined)}
                    className={`px-4 py-2.5 rounded-xl border-2 ${
                      !completionWorkerId
                        ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                        : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${!completionWorkerId ? 'text-primary-700' : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                      {t('maintenance.myself')}
                    </Text>
                  </TouchableOpacity>
                  {workers.map((worker) => (
                    <TouchableOpacity
                      key={worker.id}
                      onPress={() => setCompletionWorkerId(worker.id)}
                      className={`px-4 py-2.5 rounded-xl border-2 ${
                        completionWorkerId === worker.id
                          ? isDark ? 'border-primary-500 bg-primary-900/40' : 'border-primary-500 bg-primary-50'
                          : isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className={`text-sm font-medium ${completionWorkerId === worker.id ? 'text-primary-700' : (isDark ? 'text-slate-200' : 'text-slate-700')}`}>
                        {worker.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Cost */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <DollarSign size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                <Text className={`text-sm font-semibold ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('maintenance.costOptional')}</Text>
              </View>
              <Input
                placeholder="0.00"
                value={completionCost}
                onChangeText={setCompletionCost}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Notes */}
            <View className="mb-5">
              <View className="flex-row items-center mb-2">
                <FileText size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                <Text className={`text-sm font-semibold ml-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('maintenance.notesOptional')}</Text>
              </View>
              <Input
                placeholder={t('maintenance.notesPlaceholder')}
                value={completionNotes}
                onChangeText={setCompletionNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
          <View className={`flex-row items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)} className="p-2">
              <X size={22} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('maintenance.completionHistory')}</Text>
            <View className="w-10" />
          </View>

          <ScrollView className="flex-1 px-5 py-4">
            {historyTask && (
              <View className={`rounded-xl p-4 mb-5 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                <Text className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{historyTask.title}</Text>
                <Text className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{getFrequencyLabel(historyTask.frequency)}</Text>
              </View>
            )}

            {taskCompletions.length === 0 ? (
              <View className="items-center py-12">
                <History size={48} color={isDark ? COLORS.slate[600] : COLORS.slate[300]} />
                <Text className={`mt-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('maintenance.noHistory')}</Text>
              </View>
            ) : (
              <View className="gap-3">
                {taskCompletions.map((completion, index) => (
                  <Card key={completion.id} variant="default" padding="md">
                    <View className="flex-row items-start">
                      <View className={`w-8 h-8 rounded-full items-center justify-center ${isDark ? 'bg-green-900/40' : 'bg-green-100'}`}>
                        <CheckCircle2 size={16} color={COLORS.success} />
                      </View>
                      <View className="flex-1 ml-3">
                        <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {formatDate(completion.completedDate, 'MMMM d, yyyy')}
                        </Text>
                        {completion.workerName ? (
                          <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('maintenance.doneBy')} {completion.workerName}</Text>
                        ) : (
                          <Text className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('maintenance.doneBy')} {t('maintenance.myself')}</Text>
                        )}
                        {completion.cost && (
                          <Text className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{t('maintenance.cost')}: ${completion.cost.toFixed(2)}</Text>
                        )}
                        {completion.notes && (
                          <Text className={`text-sm mt-2 p-2 rounded-lg ${isDark ? 'text-slate-300 bg-slate-700' : 'text-slate-600 bg-slate-50'}`}>{completion.notes}</Text>
                        )}
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
