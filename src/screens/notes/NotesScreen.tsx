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
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../../navigation/types';
import { Note, Property } from '../../types';
import { notesRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, EmptyState, FAB, Badge } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { formatRelativeDate } from '../../utils/date';
import { useTheme } from '../../contexts';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type NotesScreenRouteProp = RouteProp<RootStackParamList, 'Notes'>;

export function NotesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<NotesScreenRouteProp>();
  const { propertyId } = route.params;
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState('');

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
      });
      setNewNoteContent('');
      setShowAddNote(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (error) {
      console.error('Failed to create note:', error);
      Alert.alert('Error', 'Failed to create note');
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote || !editContent.trim()) return;

    try {
      await notesRepository.update(editingNote.id, {
        content: editContent.trim(),
      });
      setEditingNote(null);
      setEditContent('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadData();
    } catch (error) {
      console.error('Failed to update note:', error);
      Alert.alert('Error', 'Failed to update note');
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
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await notesRepository.delete(note.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              loadData();
            } catch (error) {
              console.error('Failed to delete note:', error);
              Alert.alert('Error', 'Failed to delete note');
            }
          },
        },
      ]
    );
  };

  const startEditing = (note: Note) => {
    setEditingNote(note);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Notes"
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
            placeholder="Search notes..."
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
                  placeholder="Write your note..."
                  placeholderTextColor={isDark ? COLORS.slate[500] : COLORS.slate[400]}
                  multiline
                  autoFocus
                  className={`text-base min-h-[100px] ${isDark ? 'text-white' : 'text-slate-900'}`}
                  textAlignVertical="top"
                />
                <View className={`flex-row justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAddNote(false);
                      setNewNoteContent('');
                    }}
                    className="px-4 py-2 rounded-lg"
                    activeOpacity={0.7}
                  >
                    <Text className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddNote}
                    disabled={!newNoteContent.trim()}
                    className={`px-4 py-2 rounded-lg ${newNoteContent.trim() ? 'bg-primary-600' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                    activeOpacity={0.7}
                  >
                    <Text className={`font-medium ${newNoteContent.trim() ? 'text-white' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>Save</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}

          {notes.length === 0 && !loading && !showAddNote ? (
            <View className="flex-1 pt-16 px-8">
              <EmptyState
                icon={<StickyNote size={44} color={COLORS.secondary[500]} />}
                title="No notes yet"
                description="Add notes to keep track of important information about your property."
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
                      Pinned
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
                        onEditContentChange={setEditContent}
                        onTogglePin={() => handleTogglePin(note)}
                        onEdit={() => startEditing(note)}
                        onDelete={() => handleDeleteNote(note)}
                        onSaveEdit={handleUpdateNote}
                        onCancelEdit={cancelEditing}
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
                      Other Notes
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
                        onEditContentChange={setEditContent}
                        onTogglePin={() => handleTogglePin(note)}
                        onEdit={() => startEditing(note)}
                        onDelete={() => handleDeleteNote(note)}
                        onSaveEdit={handleUpdateNote}
                        onCancelEdit={cancelEditing}
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
  onEditContentChange: (content: string) => void;
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

function NoteCard({
  note,
  isDark,
  isEditing,
  editContent,
  onEditContentChange,
  onTogglePin,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
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
          <Text className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {formatRelativeDate(note.updatedAt)}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View className={`flex-row justify-end gap-1 mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
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
