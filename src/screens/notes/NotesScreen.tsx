import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  StickyNote,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  X,
  Check,
  Search,
  Bell,
  BellOff,
  Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RootStackParamList } from '../../navigation/types';
import { Note, Property } from '../../types';
import { notesRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, EmptyState, FAB, Badge } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { formatRelativeDate, formatDate } from '../../utils/date';
import { useTheme, useTranslation } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type NotesScreenRouteProp = RouteProp<RootStackParamList, 'Notes'>;

export function NotesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<NotesScreenRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();
  const { t } = useTranslation();

  const [property, setProperty] = useState<Property | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteReminder, setNewNoteReminder] = useState<Date | null>(null);
  const [showNewNoteDatePicker, setShowNewNoteDatePicker] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editReminder, setEditReminder] = useState<Date | null>(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [propertyData, notesData] = await Promise.all([
        propertyRepository.getById(propertyId),
        searchQuery
          ? notesRepository.search(searchQuery, propertyId)
          : notesRepository.getByPropertyId(propertyId),
      ]);
      setProperty(propertyData);
      setNotes(notesData);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      await notesRepository.create({
        propertyId,
        content: newNoteContent.trim(),
        isPinned: false,
        reminderDate: newNoteReminder ? newNoteReminder.toISOString().split('T')[0] : undefined,
      });
      setNewNoteContent('');
      setNewNoteReminder(null);
      setShowAddNote(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (error) {
      console.error('Failed to create note:', error);
      Alert.alert(t('common.error'), t('notes.alerts.createFailed'));
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editContent.trim()) return;

    try {
      await notesRepository.update(editingNote.id, {
        content: editContent.trim(),
        reminderDate: editReminder ? editReminder.toISOString().split('T')[0] : undefined,
      });
      setEditingNote(null);
      setEditContent('');
      setEditReminder(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (error) {
      console.error('Failed to update note:', error);
      Alert.alert(t('common.error'), t('notes.alerts.updateFailed'));
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      await notesRepository.togglePin(note.id);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadData();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleDeleteNote = (note: Note) => {
    Alert.alert(
      t('notes.deleteTitle'),
      t('notes.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await notesRepository.delete(note.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadData();
            } catch (error) {
              console.error('Failed to delete note:', error);
              Alert.alert(t('common.error'), t('notes.alerts.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const startEditing = (note: Note) => {
    setEditingNote(note);
    setEditContent(note.content);
    setEditReminder(note.reminderDate ? new Date(note.reminderDate) : null);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
    setEditReminder(null);
  };

  const handleClearReminder = async (note: Note) => {
    try {
      await notesRepository.clearReminder(note.id);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      loadData();
    } catch (error) {
      console.error('Failed to clear reminder:', error);
    }
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title={t('notes.title')}
        subtitle={property?.name}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Search Bar */}
      <View className={`px-5 py-3 ${isDark ? 'bg-slate-800' : 'bg-white'} border-b ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
        <View className={`flex-row items-center rounded-xl px-4 py-2.5 ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
          <Search size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('notes.searchPlaceholder')}
            placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
            className={`flex-1 ml-2 text-base ${isDark ? 'text-white' : 'text-slate-900'}`}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary[600]}
            />
          }
        >
          {/* Add Note Form */}
          {showAddNote && (
            <View className="px-5 pt-4">
              <Card variant="default" padding="md" className={isDark ? 'bg-slate-800' : ''}>
                <TextInput
                  value={newNoteContent}
                  onChangeText={setNewNoteContent}
                  placeholder={t('notes.writeNote')}
                  placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  multiline
                  autoFocus
                  className={`text-base min-h-[100px] ${isDark ? 'text-white' : 'text-slate-900'}`}
                  textAlignVertical="top"
                />
                {/* Reminder Date Picker */}
                <TouchableOpacity
                  onPress={() => setShowNewNoteDatePicker(true)}
                  className={`flex-row items-center mt-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
                >
                  <Bell size={18} color={newNoteReminder ? COLORS.secondary[500] : isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                  <Text className={`flex-1 ml-2 ${newNoteReminder ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
                    {newNoteReminder ? formatDate(newNoteReminder.toISOString()) : t('notes.addReminder')}
                  </Text>
                  {newNoteReminder && (
                    <TouchableOpacity onPress={() => setNewNoteReminder(null)}>
                      <X size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showNewNoteDatePicker && (
                  <DateTimePicker
                    value={newNoteReminder || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(_, selectedDate) => {
                      setShowNewNoteDatePicker(Platform.OS === 'ios');
                      if (selectedDate) setNewNoteReminder(selectedDate);
                    }}
                  />
                )}
                <View className={`flex-row justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddNote(false);
                      setNewNoteContent('');
                      setNewNoteReminder(null);
                    }}
                    className="px-4 py-2 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Text className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className={`px-4 py-2 rounded-lg ${newNoteContent.trim() ? 'bg-primary-600' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`font-medium ${newNoteContent.trim() ? 'text-white' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}

          {notes.length === 0 && !loading && !showAddNote ? (
            <View className="flex-1 pt-16 px-8">
              <EmptyState
                icon={<StickyNote size={44} color={COLORS.secondary[500]} />}
                title={t('notes.noNotes')}
                description={t('notes.noNotesDescription')}
              />
            </View>
          ) : (
            <View className="px-5 pt-4">
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <View className="mb-4">
                  <View className="flex-row items-center mb-3">
                    <Pin size={14} color={COLORS.secondary[500]} />
                    <Text className={`text-xs font-semibold uppercase tracking-wider ml-1.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      {t('notes.pinned')}
                    </Text>
                  </View>
                  <View className="gap-3">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isDark={isDark}
                        isEditing={editingNote?.id === note.id}
                        editContent={editContent}
                        editReminder={editReminder}
                        showEditDatePicker={showEditDatePicker}
                        onEditContentChange={setEditContent}
                        onEditReminderChange={setEditReminder}
                        onToggleDatePicker={setShowEditDatePicker}
                        onTogglePin={() => handleTogglePin(note)}
                        onEdit={() => startEditing(note)}
                        onDelete={() => handleDeleteNote(note)}
                        onSaveEdit={handleUpdateNote}
                        onCancelEdit={cancelEditing}
                        onClearReminder={() => handleClearReminder(note)}
                        t={t}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Regular Notes */}
              {unpinnedNotes.length > 0 && (
                <View>
                  {pinnedNotes.length > 0 && (
                    <Text className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                      {t('notes.otherNotes')}
                    </Text>
                  )}
                  <View className="gap-3">
                    {unpinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        isDark={isDark}
                        isEditing={editingNote?.id === note.id}
                        editContent={editContent}
                        editReminder={editReminder}
                        showEditDatePicker={showEditDatePicker}
                        onEditContentChange={setEditContent}
                        onEditReminderChange={setEditReminder}
                        onToggleDatePicker={setShowEditDatePicker}
                        onTogglePin={() => handleTogglePin(note)}
                        onEdit={() => startEditing(note)}
                        onDelete={() => handleDeleteNote(note)}
                        onSaveEdit={handleUpdateNote}
                        onCancelEdit={cancelEditing}
                        onClearReminder={() => handleClearReminder(note)}
                        t={t}
                      />
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Note FAB */}
      {!showAddNote && (
        <FAB
          icon={<Plus size={24} color="white" />}
          onPress={() => setShowAddNote(true)}
        />
      )}
    </View>
  );
}

interface NoteCardProps {
  note: Note;
  isDark: boolean;
  isEditing: boolean;
  editContent: string;
  editReminder: Date | null;
  showEditDatePicker: boolean;
  onEditContentChange: (content: string) => void;
  onEditReminderChange: (date: Date | null) => void;
  onToggleDatePicker: (show: boolean) => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onClearReminder: () => void;
  t: (key: string) => string;
}

function NoteCard({
  note,
  isDark,
  isEditing,
  editContent,
  editReminder,
  showEditDatePicker,
  onEditContentChange,
  onEditReminderChange,
  onToggleDatePicker,
  onTogglePin,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onClearReminder,
  t,
}: NoteCardProps) {
  if (isEditing) {
    return (
      <Card variant="default" padding="md" className={`${isDark ? 'bg-slate-800' : ''} border-2 border-primary-500`}>
        <TextInput
          value={editContent}
          onChangeText={onEditContentChange}
          multiline
          autoFocus
          className={`text-base min-h-[80px] ${isDark ? 'text-white' : 'text-slate-900'}`}
          textAlignVertical="top"
        />
        {/* Reminder Date Picker */}
        <TouchableOpacity
          onPress={() => onToggleDatePicker(true)}
          className={`flex-row items-center mt-3 p-3 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
        >
          <Bell size={18} color={editReminder ? COLORS.secondary[500] : isDark ? COLORS.slate[400] : COLORS.slate[500]} />
          <Text className={`flex-1 ml-2 ${editReminder ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
            {editReminder ? formatDate(editReminder.toISOString()) : t('notes.addReminder')}
          </Text>
          {editReminder && (
            <TouchableOpacity onPress={() => onEditReminderChange(null)}>
              <X size={18} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {showEditDatePicker && (
          <DateTimePicker
            value={editReminder || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(_, selectedDate) => {
              onToggleDatePicker(Platform.OS === 'ios');
              if (selectedDate) onEditReminderChange(selectedDate);
            }}
          />
        )}
        <View className={`flex-row justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
          <TouchableOpacity
            onPress={onCancelEdit}
            className="w-10 h-10 rounded-full items-center justify-center"
            activeOpacity={0.7}
          >
            <X size={20} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSaveEdit}
            className="w-10 h-10 rounded-full bg-primary-600 items-center justify-center"
            activeOpacity={0.7}
          >
            <Check size={20} color="white" />
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="md" className={isDark ? 'bg-slate-800' : ''}>
      <View className="flex-row items-start">
        <View className="flex-1">
          <Text className={`text-base leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {note.content}
          </Text>
          <View className="flex-row items-center mt-2 gap-3">
            <Text className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              {formatRelativeDate(note.updatedAt)}
            </Text>
            {note.reminderDate && (
              <View className="flex-row items-center">
                <Bell size={12} color={COLORS.secondary[500]} />
                <Text className={`text-xs ml-1 text-secondary-600`}>
                  {formatDate(note.reminderDate)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Actions */}
      <View className={`flex-row justify-end gap-1 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
        {note.reminderDate && (
          <TouchableOpacity
            onPress={onClearReminder}
            className={`w-9 h-9 rounded-lg items-center justify-center bg-secondary-100`}
            activeOpacity={0.7}
          >
            <BellOff size={16} color={COLORS.secondary[600]} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onTogglePin}
          className={`w-9 h-9 rounded-lg items-center justify-center ${note.isPinned ? 'bg-secondary-100' : isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
          activeOpacity={0.7}
        >
          {note.isPinned ? (
            <PinOff size={16} color={COLORS.secondary[600]} />
          ) : (
            <Pin size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onEdit}
          className={`w-9 h-9 rounded-lg items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
          activeOpacity={0.7}
        >
          <Edit3 size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[500]} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onDelete}
          className={`w-9 h-9 rounded-lg items-center justify-center ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
          activeOpacity={0.7}
        >
          <Trash2 size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}
