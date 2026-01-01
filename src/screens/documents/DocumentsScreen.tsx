import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  File,
  Image as ImageIcon,
  Book,
  Shield,
  Receipt,
  FileSignature,
  Filter,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../../navigation/types';
import { Document, Property } from '../../types';
import { documentRepository, propertyRepository } from '../../services/database';
import { ScreenHeader, Card, Button, Badge, InputDialog } from '../../components/ui';
import { COLORS } from '../../constants/theme';
import { formatDate } from '../../utils/date';
import { useToast, useTheme } from '../../contexts';
import { getImageQuality } from '../../utils/image';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DocumentsRouteProp = RouteProp<RootStackParamList, 'Documents'>;

const DOCUMENT_TYPES: Array<{ value: Document['type']; label: string; icon: any; color: string }> = [
  { value: 'manual', label: 'Manual', icon: Book, color: '#3b82f6' },
  { value: 'warranty', label: 'Warranty', icon: Shield, color: '#22c55e' },
  { value: 'receipt', label: 'Receipt', icon: Receipt, color: '#8b5cf6' },
  { value: 'contract', label: 'Contract', icon: FileSignature, color: '#f97316' },
  { value: 'photo', label: 'Photo', icon: ImageIcon, color: '#ec4899' },
  { value: 'other', label: 'Other', icon: File, color: '#64748b' },
];

function getDocumentTypeConfig(type: Document['type']) {
  return DOCUMENT_TYPES.find((t) => t.value === type) || DOCUMENT_TYPES[5];
}

export function DocumentsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DocumentsRouteProp>();
  const { propertyId, assetId } = route.params;

  const { showSuccess, showError } = useToast();
  const { isDark } = useTheme();

  const [property, setProperty] = useState<Property | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<Document['type'] | 'all'>('all');
  const [showAddOptions, setShowAddOptions] = useState(false);

  // State for InputDialog
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<{
    uri: string;
    fileType: Document['fileType'];
    docType: Document['type'];
    defaultName: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const propertyData = await propertyRepository.getById(propertyId);
      setProperty(propertyData);

      let docs: Document[];
      if (assetId) {
        docs = await documentRepository.getByAssetId(assetId);
      } else {
        docs = await documentRepository.getByPropertyId(propertyId);
      }
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [propertyId, assetId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredDocuments = filterType === 'all'
    ? documents
    : documents.filter((d) => d.type === filterType);

  const handlePickDocument = async (docType: Document['type']) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const fileType: Document['fileType'] = file.mimeType?.startsWith('image/') ? 'image' : 'pdf';

        setPendingDocument({
          uri: file.uri,
          fileType,
          docType,
          defaultName: file.name?.replace(/\.[^/.]+$/, '') || '',
        });
        setShowNameDialog(true);
      }
    } catch (error) {
      console.error('Failed to pick document:', error);
      showError('Failed to add document');
    }
    setShowAddOptions(false);
  };

  const handlePickImage = async (docType: Document['type']) => {
    try {
      const quality = await getImageQuality();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality,
      });

      if (!result.canceled && result.assets[0]) {
        setPendingDocument({
          uri: result.assets[0].uri,
          fileType: 'image',
          docType,
          defaultName: '',
        });
        setShowNameDialog(true);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      showError('Failed to add image');
    }
    setShowAddOptions(false);
  };

  const handleSaveDocument = async (name: string) => {
    if (!pendingDocument || !name.trim()) {
      setShowNameDialog(false);
      setPendingDocument(null);
      return;
    }

    try {
      await documentRepository.create({
        propertyId,
        assetId: assetId || undefined,
        name: name.trim(),
        type: pendingDocument.docType,
        fileUri: pendingDocument.uri,
        fileType: pendingDocument.fileType,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess('Document added successfully');
      loadData();
    } catch (error) {
      console.error('Failed to save document:', error);
      showError('Failed to save document');
    } finally {
      setShowNameDialog(false);
      setPendingDocument(null);
    }
  };

  const handleOpenDocument = async (doc: Document) => {
    try {
      await Linking.openURL(doc.fileUri);
    } catch (error) {
      console.error('Failed to open document:', error);
      Alert.alert('Error', 'Unable to open this document');
    }
  };

  const handleDelete = (doc: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await documentRepository.delete(doc.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete document:', error);
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const showDocumentTypeSelector = () => {
    Alert.alert(
      'Select Document Type',
      'What type of document is this?',
      [
        ...DOCUMENT_TYPES.map((type) => ({
          text: type.label,
          onPress: () => {
            if (type.value === 'photo') {
              handlePickImage(type.value);
            } else {
              handlePickDocument(type.value);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Group documents by type
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.type]) acc[doc.type] = [];
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <View className={`flex-1 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <ScreenHeader
        title="Documents"
        subtitle={property?.name}
        showBack
        onBack={() => navigation.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={showDocumentTypeSelector}
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[600]}
          />
        }
      >
        {/* Filter Tabs */}
        <View className="px-5 pt-5">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <TouchableOpacity
              onPress={() => setFilterType('all')}
              className={`px-4 py-2 rounded-full ${
                filterType === 'all'
                  ? isDark ? 'bg-slate-100' : 'bg-slate-900'
                  : isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-sm font-medium ${
                  filterType === 'all'
                    ? isDark ? 'text-slate-900' : 'text-white'
                    : isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                All ({documents.length})
              </Text>
            </TouchableOpacity>
            {DOCUMENT_TYPES.map((type) => {
              const count = documents.filter((d) => d.type === type.value).length;
              if (count === 0) return null;
              return (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setFilterType(type.value)}
                  className={`px-4 py-2 rounded-full ${
                    filterType === type.value
                      ? isDark ? 'bg-slate-100' : 'bg-slate-900'
                      : isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-medium ${
                      filterType === type.value
                        ? isDark ? 'text-slate-900' : 'text-white'
                        : isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {type.label} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Documents List */}
        {documents.length === 0 ? (
          <View className="px-5 mt-6">
            <Card variant="filled" padding="lg">
              <View className="items-center py-6">
                <View className={`w-16 h-16 rounded-2xl items-center justify-center mb-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                  <FileText size={32} color={isDark ? COLORS.slate[500] : COLORS.slate[400]} />
                </View>
                <Text className={`text-lg font-semibold text-center ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  No documents saved
                </Text>
                <Text className={`text-sm text-center mt-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Store manuals, warranties, receipts, and contracts for easy access
                </Text>
                <Button
                  title="Add Document"
                  onPress={showDocumentTypeSelector}
                  variant="primary"
                  className="mt-4"
                  icon={<Plus size={18} color="#ffffff" />}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-4 pb-8">
            {filterType === 'all' ? (
              // Show grouped by type
              Object.entries(groupedDocuments).map(([type, docs]) => {
                const typeConfig = getDocumentTypeConfig(type as Document['type']);
                const Icon = typeConfig.icon;

                return (
                  <View key={type}>
                    <View className="flex-row items-center mb-2">
                      <Icon size={14} color={typeConfig.color} />
                      <Text className={`text-sm font-semibold uppercase tracking-wide ml-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {typeConfig.label} ({docs.length})
                      </Text>
                    </View>

                    <View className="gap-2">
                      {docs.map((doc) => (
                        <DocumentCard
                          key={doc.id}
                          document={doc}
                          onOpen={() => handleOpenDocument(doc)}
                          onDelete={() => handleDelete(doc)}
                          isDark={isDark}
                        />
                      ))}
                    </View>
                  </View>
                );
              })
            ) : (
              // Show flat list for filtered type
              <View className="gap-2">
                {filteredDocuments.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onOpen={() => handleOpenDocument(doc)}
                    onDelete={() => handleDelete(doc)}
                    isDark={isDark}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Document Name Dialog */}
      <InputDialog
        visible={showNameDialog}
        title="Document Name"
        message="Enter a name for this document"
        placeholder="Document name"
        defaultValue={pendingDocument?.defaultName || ''}
        confirmText="Save"
        onCancel={() => {
          setShowNameDialog(false);
          setPendingDocument(null);
        }}
        onConfirm={handleSaveDocument}
      />
    </View>
  );
}

interface DocumentCardProps {
  document: Document;
  onOpen: () => void;
  onDelete: () => void;
  isDark: boolean;
}

function DocumentCard({ document, onOpen, onDelete, isDark }: DocumentCardProps) {
  const typeConfig = getDocumentTypeConfig(document.type);
  const Icon = typeConfig.icon;

  return (
    <Card variant="default" padding="none">
      <TouchableOpacity
        onPress={onOpen}
        activeOpacity={0.7}
        className="p-4"
      >
        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${typeConfig.color}15` }}
          >
            <Icon size={24} color={typeConfig.color} />
          </View>

          <View className="flex-1 ml-3">
            <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`} numberOfLines={1}>
              {document.name}
            </Text>
            <View className="flex-row items-center mt-1">
              <Badge
                label={document.fileType.toUpperCase()}
                variant="default"
                size="sm"
              />
              <Text className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {formatDate(document.createdAt, 'MMM d, yyyy')}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={onOpen}
              className={`p-2 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}
              activeOpacity={0.7}
            >
              <ExternalLink size={16} color={isDark ? COLORS.slate[400] : COLORS.slate[600]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDelete}
              className={`p-2 rounded-lg ${isDark ? 'bg-red-900/30' : 'bg-red-50'}`}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );
}
