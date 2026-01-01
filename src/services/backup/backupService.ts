import { Paths, File, Directory } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { Alert, Platform } from 'react-native';

// Lazy load expo-sharing to avoid crash in Expo Go
let Sharing: typeof import('expo-sharing') | null = null;
const loadSharing = async () => {
  if (Sharing === null) {
    try {
      Sharing = await import('expo-sharing');
    } catch (e) {
      console.log('expo-sharing not available');
    }
  }
  return Sharing;
};

// Encryption marker - V2 uses improved encryption
const ENCRYPTION_MARKER = 'HOMETRACK_ENCRYPTED_V2';
const LEGACY_MARKER = 'HOMETRACK_ENCRYPTED_V1';

// PBKDF2-like key derivation with 10000 iterations
async function deriveKey(password: string, salt: string): Promise<Uint8Array> {
  let key = password + salt;
  for (let i = 0; i < 10000; i++) {
    key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key
    );
  }
  // Convert hex string to bytes
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(key.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Generate keystream for encryption/decryption using CTR mode simulation
async function generateKeystream(key: Uint8Array, iv: Uint8Array, length: number): Promise<Uint8Array> {
  const keystream = new Uint8Array(length);
  const blocksNeeded = Math.ceil(length / 32);
  let offset = 0;

  for (let blockNum = 0; blockNum < blocksNeeded; blockNum++) {
    // Create counter block: IV + block number
    const counterBlock = new Uint8Array(48);
    counterBlock.set(iv, 0);
    counterBlock.set(key, 16);
    // Add block number as big-endian
    const blockBytes = new Uint8Array(4);
    blockBytes[0] = (blockNum >> 24) & 0xff;
    blockBytes[1] = (blockNum >> 16) & 0xff;
    blockBytes[2] = (blockNum >> 8) & 0xff;
    blockBytes[3] = blockNum & 0xff;
    counterBlock.set(blockBytes, 44);

    // Hash to generate block keystream
    const blockHex = Array.from(counterBlock)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const hashHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      blockHex
    );

    // Convert hash to bytes
    for (let i = 0; i < 32 && offset < length; i++, offset++) {
      keystream[offset] = parseInt(hashHex.substring(i * 2, i * 2 + 2), 16);
    }
  }

  return keystream;
}

// Convert string to UTF-8 bytes
function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

// Convert bytes to string
function bytesToString(bytes: Uint8Array): string {
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

// Convert bytes to base64
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 to bytes
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Encrypt data with password using CTR mode
async function encryptData(data: string, password: string): Promise<string> {
  // Generate random salt and IV
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const ivBytes = await Crypto.getRandomBytesAsync(16);

  const salt = bytesToBase64(saltBytes);
  const iv = bytesToBase64(ivBytes);

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Convert data to bytes
  const dataBytes = stringToBytes(data);

  // Generate keystream
  const keystream = await generateKeystream(key, ivBytes, dataBytes.length);

  // XOR data with keystream (CTR mode)
  const encrypted = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keystream[i];
  }

  // Compute HMAC for integrity verification
  const hmacInput = salt + ':' + iv + ':' + bytesToBase64(encrypted);
  const hmac = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Array.from(key).join('') + hmacInput
  );

  // Return marker + salt + iv + encrypted data + hmac
  return ENCRYPTION_MARKER + ':' + salt + ':' + iv + ':' + bytesToBase64(encrypted) + ':' + hmac;
}

// Decrypt data with password
async function decryptData(encryptedData: string, password: string): Promise<string> {
  const parts = encryptedData.split(':');

  // Handle legacy V1 format
  if (parts[0] === LEGACY_MARKER && parts.length === 3) {
    return decryptLegacyData(encryptedData, password);
  }

  if (parts.length !== 5 || parts[0] !== ENCRYPTION_MARKER) {
    throw new Error('Invalid encrypted data format');
  }

  const [, salt, iv, encryptedBase64, storedHmac] = parts;

  // Derive key
  const key = await deriveKey(password, salt);

  // Verify HMAC
  const hmacInput = salt + ':' + iv + ':' + encryptedBase64;
  const computedHmac = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Array.from(key).join('') + hmacInput
  );

  if (computedHmac !== storedHmac) {
    throw new Error('Incorrect password or corrupted file');
  }

  // Decrypt
  const encrypted = base64ToBytes(encryptedBase64);
  const ivBytes = base64ToBytes(iv);
  const keystream = await generateKeystream(key, ivBytes, encrypted.length);

  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keystream[i];
  }

  return bytesToString(decrypted);
}

// Legacy V1 decryption for backwards compatibility
async function decryptLegacyData(encryptedData: string, password: string): Promise<string> {
  const parts = encryptedData.split(':');
  const salt = parts[1];
  const encrypted = atob(parts[2]);

  // Old key derivation with 1000 iterations
  let key = password + salt;
  for (let i = 0; i < 1000; i++) {
    key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      key
    );
  }

  // XOR decrypt
  let result = '';
  for (let i = 0; i < encrypted.length; i++) {
    result += String.fromCharCode(
      encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

// Check if data is encrypted
function isEncrypted(data: string): boolean {
  return data.startsWith(ENCRYPTION_MARKER + ':') || data.startsWith(LEGACY_MARKER + ':');
}
import {
  propertyRepository,
  roomRepository,
  assetRepository,
  expenseRepository,
  workerRepository,
  maintenanceRepository,
  paintCodeRepository,
  measurementRepository,
  storageBoxRepository,
  wifiInfoRepository,
  documentRepository,
  renovationRepository,
  emergencyRepository,
  recurringTemplateRepository,
  notesRepository,
} from '../database';
import { getCurrentISODate } from '../../utils/date';

const APP_VERSION = '1.0.0';
const SCHEMA_VERSION = 1;

interface BackupManifest {
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  deviceInfo?: string;
  stats: {
    properties: number;
    rooms: number;
    assets: number;
    expenses: number;
    workers: number;
    maintenanceTasks: number;
    paintCodes: number;
    measurements: number;
    storageBoxes: number;
    wifiNetworks: number;
    documents: number;
    renovations: number;
    emergencyShutoffs: number;
    recurringTemplates: number;
    notes: number;
  };
}

interface BackupData {
  manifest: BackupManifest;
  data: {
    properties: any[];
    rooms: any[];
    assets: any[];
    expenses: any[];
    workers: any[];
    maintenanceTasks: any[];
    paintCodes: any[];
    measurements: any[];
    storageBoxes: any[];
    wifiNetworks: any[];
    documents: any[];
    renovations: any[];
    emergencyShutoffs: any[];
    recurringTemplates: any[];
    notes: any[];
  };
}

class BackupService {
  private get backupDir(): Directory {
    return new Directory(Paths.cache, 'backups');
  }

  async ensureBackupDirectory(): Promise<void> {
    if (!this.backupDir.exists) {
      this.backupDir.create();
    }
  }

  async exportData(password?: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      await this.ensureBackupDirectory();

      // Gather all data
      const [
        properties,
        rooms,
        assets,
        expenses,
        workers,
        maintenanceTasks,
        paintCodes,
        measurements,
        storageBoxes,
        wifiNetworks,
        documents,
        renovations,
        emergencyShutoffs,
        recurringTemplates,
        notes,
      ] = await Promise.all([
        this.getAllProperties(),
        this.getAllRooms(),
        this.getAllAssets(),
        this.getAllExpenses(),
        workerRepository.getAll(),
        this.getAllMaintenanceTasks(),
        this.getAllPaintCodes(),
        this.getAllMeasurements(),
        this.getAllStorageBoxes(),
        this.getAllWifiNetworks(),
        documentRepository.getAll(),
        this.getAllRenovations(),
        this.getAllEmergencyShutoffs(),
        this.getAllRecurringTemplates(),
        this.getAllNotes(),
      ]);

      const backupData: BackupData = {
        manifest: {
          appVersion: APP_VERSION,
          schemaVersion: SCHEMA_VERSION,
          createdAt: getCurrentISODate(),
          stats: {
            properties: properties.length,
            rooms: rooms.length,
            assets: assets.length,
            expenses: expenses.length,
            workers: workers.length,
            maintenanceTasks: maintenanceTasks.length,
            paintCodes: paintCodes.length,
            measurements: measurements.length,
            storageBoxes: storageBoxes.length,
            wifiNetworks: wifiNetworks.length,
            documents: documents.length,
            renovations: renovations.length,
            emergencyShutoffs: emergencyShutoffs.length,
            recurringTemplates: recurringTemplates.length,
            notes: notes.length,
          },
        },
        data: {
          properties,
          rooms,
          assets,
          expenses,
          workers,
          maintenanceTasks,
          paintCodes,
          measurements,
          storageBoxes,
          wifiNetworks,
          documents,
          renovations,
          emergencyShutoffs,
          recurringTemplates,
          notes,
        },
      };

      // Create backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const isEncryptedBackup = !!password;
      const fileName = isEncryptedBackup
        ? `hometrack-backup-${timestamp}.encrypted`
        : `hometrack-backup-${timestamp}.json`;
      const backupFile = new File(this.backupDir, fileName);

      // Prepare file content
      let fileContent = JSON.stringify(backupData, null, 2);

      // Encrypt if password provided
      if (password) {
        fileContent = await encryptData(fileContent, password);
      }

      backupFile.create();
      backupFile.write(fileContent);

      // Share the file
      const sharing = await loadSharing();
      if (sharing && await sharing.isAvailableAsync()) {
        await sharing.shareAsync(backupFile.uri, {
          mimeType: isEncryptedBackup ? 'application/octet-stream' : 'application/json',
          dialogTitle: 'Export HomeTrack Backup',
          UTI: isEncryptedBackup ? 'public.data' : 'public.json',
        });
      } else {
        // Fallback for Expo Go - just show the file path
        Alert.alert(
          'Backup Created',
          `${isEncryptedBackup ? 'Encrypted backup' : 'Backup'} saved to:\n${backupFile.uri}\n\nNote: Sharing is not available in Expo Go. Use a development build for full functionality.`
        );
      }

      return { success: true, filePath: backupFile.uri };
    } catch (error) {
      console.error('Export failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async importData(password?: string): Promise<{ success: boolean; stats?: BackupManifest['stats']; error?: string; needsPassword?: boolean }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        return { success: false, error: 'No file selected' };
      }

      const importFile = new File(result.assets[0].uri);
      let fileContent = await importFile.text();

      // Check if file is encrypted
      if (isEncrypted(fileContent)) {
        if (!password) {
          return { success: false, needsPassword: true, error: 'This backup is encrypted. Please provide the password.' };
        }

        try {
          fileContent = await decryptData(fileContent, password);
        } catch (decryptError) {
          return { success: false, error: 'Incorrect password or corrupted file' };
        }
      }

      let backupData: BackupData;
      try {
        backupData = JSON.parse(fileContent);
      } catch (parseError) {
        return { success: false, error: 'Invalid backup file format or incorrect password' };
      }

      // Validate backup format
      if (!backupData.manifest || !backupData.data) {
        return { success: false, error: 'Invalid backup file format' };
      }

      // Check schema version compatibility
      if (backupData.manifest.schemaVersion > SCHEMA_VERSION) {
        return {
          success: false,
          error: 'Backup was created with a newer version of the app. Please update the app first.',
        };
      }

      // Import data (merge with existing)
      await this.importDataFromBackup(backupData.data);

      return { success: true, stats: backupData.manifest.stats };
    } catch (error) {
      console.error('Import failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Check if a file is encrypted (useful for UI to know when to show password prompt)
  async checkFileEncryption(uri: string): Promise<boolean> {
    try {
      const file = new File(uri);
      const content = await file.text();
      return isEncrypted(content);
    } catch {
      return false;
    }
  }

  private async importDataFromBackup(data: BackupData['data']): Promise<void> {
    // Get existing data to check for duplicates
    const existingWorkers = await workerRepository.getAll();
    const existingProperties = await propertyRepository.getAll();

    // Import workers first (no dependencies) - skip duplicates by name+phone
    const workerIdMap = new Map<string, string>();
    for (const worker of data.workers) {
      try {
        // Check for duplicate by name and phone
        const existingWorker = existingWorkers.find(
          w => w.name.toLowerCase() === worker.name.toLowerCase() &&
               (w.phone === worker.phone || (!w.phone && !worker.phone))
        );

        if (existingWorker) {
          // Map old ID to existing ID
          workerIdMap.set(worker.id, existingWorker.id);
          console.log(`Skipping duplicate worker: ${worker.name}`);
        } else {
          const newWorker = await workerRepository.create({
            name: worker.name,
            phone: worker.phone,
            email: worker.email,
            company: worker.company,
            specialty: worker.specialty || [],
            rating: worker.rating,
            notes: worker.notes,
            imageUri: worker.imageUri,
          });
          workerIdMap.set(worker.id, newWorker.id);
        }
      } catch (e) {
        console.log('Error importing worker:', e);
      }
    }

    // Import properties and track ID mapping - skip duplicates by name+address
    const propertyIdMap = new Map<string, string>();
    for (const property of data.properties) {
      try {
        // Check for duplicate by name and address
        const existingProperty = existingProperties.find(
          p => p.name.toLowerCase() === property.name.toLowerCase() &&
               p.address.toLowerCase() === property.address.toLowerCase()
        );

        if (existingProperty) {
          // Map old ID to existing ID
          propertyIdMap.set(property.id, existingProperty.id);
          console.log(`Skipping duplicate property: ${property.name}`);
        } else {
          const newProperty = await propertyRepository.create({
            name: property.name,
            address: property.address,
            type: property.type,
            imageUri: property.imageUri,
          });
          propertyIdMap.set(property.id, newProperty.id);
        }
      } catch (e) {
        console.log('Error importing property:', e);
      }
    }

    // Import rooms (depends on properties)
    const roomIdMap = new Map<string, string>();
    for (const room of data.rooms) {
      try {
        const newPropertyId = propertyIdMap.get(room.propertyId);
        if (newPropertyId) {
          const newRoom = await roomRepository.create({
            propertyId: newPropertyId,
            name: room.name,
            type: room.type,
            imageUri: room.imageUri,
            notes: room.notes,
          });
          roomIdMap.set(room.id, newRoom.id);
        }
      } catch (e) {
        console.log('Error importing room:', e);
      }
    }

    // Import assets (depends on properties and rooms) and track ID mapping
    const assetIdMap = new Map<string, string>();
    for (const asset of data.assets) {
      try {
        const newPropertyId = propertyIdMap.get(asset.propertyId);
        const newRoomId = asset.roomId ? roomIdMap.get(asset.roomId) : undefined;
        if (newPropertyId) {
          const newAsset = await assetRepository.create({
            propertyId: newPropertyId,
            roomId: newRoomId,
            name: asset.name,
            category: asset.category,
            brand: asset.brand,
            model: asset.model,
            serialNumber: asset.serialNumber,
            purchaseDate: asset.purchaseDate,
            purchasePrice: asset.purchasePrice,
            warrantyEndDate: asset.warrantyEndDate,
            notes: asset.notes,
            imageUri: asset.imageUri,
            manualUri: asset.manualUri,
          });
          assetIdMap.set(asset.id, newAsset.id);
        }
      } catch (e) {
        console.log('Error importing asset:', e);
      }
    }

    // Import expenses (with proper asset/worker mapping)
    for (const expense of data.expenses) {
      try {
        const newPropertyId = propertyIdMap.get(expense.propertyId);
        const newRoomId = expense.roomId ? roomIdMap.get(expense.roomId) : undefined;
        const newAssetId = expense.assetId ? assetIdMap.get(expense.assetId) : undefined;
        const newWorkerId = expense.workerId ? workerIdMap.get(expense.workerId) : undefined;
        if (newPropertyId) {
          await expenseRepository.create({
            propertyId: newPropertyId,
            roomId: newRoomId,
            assetId: newAssetId,
            workerId: newWorkerId,
            type: expense.type,
            category: expense.category,
            amount: expense.amount,
            date: expense.date,
            description: expense.description,
            receiptUri: expense.receiptUri,
            isRecurring: expense.isRecurring || false,
            tags: expense.tags,
          });
        }
      } catch (e) {
        console.log('Error importing expense:', e);
      }
    }

    // Import maintenance tasks (with proper asset/worker mapping)
    for (const task of data.maintenanceTasks) {
      try {
        const newPropertyId = propertyIdMap.get(task.propertyId);
        const newAssetId = task.assetId ? assetIdMap.get(task.assetId) : undefined;
        const newWorkerId = task.assignedWorkerId ? workerIdMap.get(task.assignedWorkerId) : undefined;
        if (newPropertyId) {
          await maintenanceRepository.create({
            propertyId: newPropertyId,
            assetId: newAssetId,
            assignedWorkerId: newWorkerId,
            title: task.title,
            description: task.description,
            frequency: task.frequency,
            lastCompletedDate: task.lastCompletedDate,
            nextDueDate: task.nextDueDate,
            reminderDaysBefore: task.reminderDaysBefore,
          });
        }
      } catch (e) {
        console.log('Error importing maintenance task:', e);
      }
    }

    // Import paint codes
    for (const paintCode of data.paintCodes) {
      try {
        const newPropertyId = propertyIdMap.get(paintCode.propertyId);
        const newRoomId = paintCode.roomId ? roomIdMap.get(paintCode.roomId) : undefined;
        if (newPropertyId) {
          await paintCodeRepository.create({
            propertyId: newPropertyId,
            roomId: newRoomId,
            location: paintCode.location,
            brand: paintCode.brand,
            colorName: paintCode.colorName,
            colorCode: paintCode.colorCode,
            finish: paintCode.finish,
            imageUri: paintCode.imageUri,
            notes: paintCode.notes,
          });
        }
      } catch (e) {
        console.log('Error importing paint code:', e);
      }
    }

    // Import measurements (with proper asset mapping)
    for (const measurement of data.measurements) {
      try {
        const newPropertyId = propertyIdMap.get(measurement.propertyId);
        const newRoomId = measurement.roomId ? roomIdMap.get(measurement.roomId) : undefined;
        const newAssetId = measurement.assetId ? assetIdMap.get(measurement.assetId) : undefined;
        if (newPropertyId) {
          await measurementRepository.create({
            propertyId: newPropertyId,
            roomId: newRoomId,
            assetId: newAssetId,
            name: measurement.name,
            width: measurement.width,
            height: measurement.height,
            depth: measurement.depth,
            unit: measurement.unit,
            notes: measurement.notes,
            imageUri: measurement.imageUri,
          });
        }
      } catch (e) {
        console.log('Error importing measurement:', e);
      }
    }

    // Import storage boxes
    for (const box of data.storageBoxes) {
      try {
        const newPropertyId = propertyIdMap.get(box.propertyId);
        const newRoomId = box.roomId ? roomIdMap.get(box.roomId) : undefined;
        if (newPropertyId) {
          await storageBoxRepository.create({
            propertyId: newPropertyId,
            roomId: newRoomId,
            name: box.name,
            location: box.location,
            contents: box.contents,
            imageUri: box.imageUri,
            qrCode: box.qrCode,
          });
        }
      } catch (e) {
        console.log('Error importing storage box:', e);
      }
    }

    // Import wifi networks
    for (const wifi of data.wifiNetworks) {
      try {
        const newPropertyId = propertyIdMap.get(wifi.propertyId);
        if (newPropertyId) {
          await wifiInfoRepository.create({
            propertyId: newPropertyId,
            networkName: wifi.networkName,
            password: wifi.password,
            isGuest: wifi.isGuest || false,
            qrCodeUri: wifi.qrCodeUri,
          });
        }
      } catch (e) {
        console.log('Error importing wifi network:', e);
      }
    }

    // Import documents (with proper asset/worker mapping)
    for (const doc of data.documents) {
      try {
        const newPropertyId = doc.propertyId ? propertyIdMap.get(doc.propertyId) : undefined;
        const newAssetId = doc.assetId ? assetIdMap.get(doc.assetId) : undefined;
        const newWorkerId = doc.workerId ? workerIdMap.get(doc.workerId) : undefined;
        await documentRepository.create({
          propertyId: newPropertyId,
          assetId: newAssetId,
          workerId: newWorkerId,
          name: doc.name,
          type: doc.type,
          fileUri: doc.fileUri,
          fileType: doc.fileType,
        });
      } catch (e) {
        console.log('Error importing document:', e);
      }
    }

    // Import renovations
    for (const renovation of data.renovations) {
      try {
        const newPropertyId = propertyIdMap.get(renovation.propertyId);
        const newRoomId = renovation.roomId ? roomIdMap.get(renovation.roomId) : undefined;
        if (newPropertyId) {
          await renovationRepository.create({
            propertyId: newPropertyId,
            roomId: newRoomId,
            title: renovation.title,
            description: renovation.description,
            beforeImageUri: renovation.beforeImageUri,
            afterImageUri: renovation.afterImageUri,
            completedDate: renovation.completedDate,
            cost: renovation.cost,
          });
        }
      } catch (e) {
        console.log('Error importing renovation:', e);
      }
    }

    // Import emergency shutoffs
    for (const shutoff of data.emergencyShutoffs) {
      try {
        const newPropertyId = propertyIdMap.get(shutoff.propertyId);
        if (newPropertyId) {
          await emergencyRepository.create({
            propertyId: newPropertyId,
            type: shutoff.type,
            location: shutoff.location,
            instructions: shutoff.instructions,
            imageUri: shutoff.imageUri,
          });
        }
      } catch (e) {
        console.log('Error importing emergency shutoff:', e);
      }
    }

    // Import recurring templates
    if (data.recurringTemplates) {
      for (const template of data.recurringTemplates) {
        try {
          const newPropertyId = propertyIdMap.get(template.propertyId);
          if (newPropertyId) {
            await recurringTemplateRepository.create({
              propertyId: newPropertyId,
              name: template.name,
              category: template.category,
              estimatedAmount: template.estimatedAmount,
              frequency: template.frequency,
              typicalPaymentDay: template.typicalPaymentDay || template.dayOfMonth?.toString(),
              isActive: template.isActive ?? true,
            });
          }
        } catch (e) {
          console.log('Error importing recurring template:', e);
        }
      }
    }

    // Import notes (with proper asset/worker mapping)
    if (data.notes) {
      for (const note of data.notes) {
        try {
          const newPropertyId = note.propertyId ? propertyIdMap.get(note.propertyId) : undefined;
          const newRoomId = note.roomId ? roomIdMap.get(note.roomId) : undefined;
          const newAssetId = note.assetId ? assetIdMap.get(note.assetId) : undefined;
          const newWorkerId = note.workerId ? workerIdMap.get(note.workerId) : undefined;
          await notesRepository.create({
            propertyId: newPropertyId,
            roomId: newRoomId,
            assetId: newAssetId,
            workerId: newWorkerId,
            content: note.content,
            isPinned: note.isPinned ?? false,
          });
        } catch (e) {
          console.log('Error importing note:', e);
        }
      }
    }
  }

  // Helper methods to get all data
  private async getAllProperties() {
    return propertyRepository.getAll();
  }

  private async getAllRooms() {
    const properties = await propertyRepository.getAll();
    const allRooms = [];
    for (const property of properties) {
      const rooms = await roomRepository.getByPropertyId(property.id);
      allRooms.push(...rooms);
    }
    return allRooms;
  }

  private async getAllAssets() {
    const properties = await propertyRepository.getAll();
    const allAssets = [];
    for (const property of properties) {
      const assets = await assetRepository.getByPropertyId(property.id);
      allAssets.push(...assets);
    }
    return allAssets;
  }

  private async getAllExpenses() {
    const properties = await propertyRepository.getAll();
    const allExpenses = [];
    for (const property of properties) {
      const expenses = await expenseRepository.getByPropertyId(property.id);
      allExpenses.push(...expenses);
    }
    return allExpenses;
  }

  private async getAllMaintenanceTasks() {
    const properties = await propertyRepository.getAll();
    const allTasks = [];
    for (const property of properties) {
      const tasks = await maintenanceRepository.getByPropertyId(property.id);
      allTasks.push(...tasks);
    }
    return allTasks;
  }

  private async getAllPaintCodes() {
    const properties = await propertyRepository.getAll();
    const allCodes = [];
    for (const property of properties) {
      const codes = await paintCodeRepository.getByPropertyId(property.id);
      allCodes.push(...codes);
    }
    return allCodes;
  }

  private async getAllMeasurements() {
    const properties = await propertyRepository.getAll();
    const allMeasurements = [];
    for (const property of properties) {
      const measurements = await measurementRepository.getByPropertyId(property.id);
      allMeasurements.push(...measurements);
    }
    return allMeasurements;
  }

  private async getAllStorageBoxes() {
    const properties = await propertyRepository.getAll();
    const allBoxes = [];
    for (const property of properties) {
      const boxes = await storageBoxRepository.getByPropertyId(property.id);
      allBoxes.push(...boxes);
    }
    return allBoxes;
  }

  private async getAllWifiNetworks() {
    const properties = await propertyRepository.getAll();
    const allNetworks = [];
    for (const property of properties) {
      const networks = await wifiInfoRepository.getByPropertyId(property.id);
      allNetworks.push(...networks);
    }
    return allNetworks;
  }

  private async getAllRenovations() {
    const properties = await propertyRepository.getAll();
    const allRenovations = [];
    for (const property of properties) {
      const renovations = await renovationRepository.getByPropertyId(property.id);
      allRenovations.push(...renovations);
    }
    return allRenovations;
  }

  private async getAllEmergencyShutoffs() {
    const properties = await propertyRepository.getAll();
    const allShutoffs = [];
    for (const property of properties) {
      const shutoffs = await emergencyRepository.getByPropertyId(property.id);
      allShutoffs.push(...shutoffs);
    }
    return allShutoffs;
  }

  private async getAllRecurringTemplates() {
    const properties = await propertyRepository.getAll();
    const allTemplates = [];
    for (const property of properties) {
      const templates = await recurringTemplateRepository.getByPropertyId(property.id);
      allTemplates.push(...templates);
    }
    return allTemplates;
  }

  private async getAllNotes() {
    const properties = await propertyRepository.getAll();
    const allNotes = [];
    for (const property of properties) {
      const notes = await notesRepository.getByPropertyId(property.id);
      allNotes.push(...notes);
    }
    return allNotes;
  }

  async clearAllData(): Promise<void> {
    // This is a destructive operation - handled by dropping and recreating tables
    // For now, we'll delete each property which cascades to delete everything
    const properties = await propertyRepository.getAll();
    for (const property of properties) {
      await propertyRepository.delete(property.id);
    }

    // Delete all workers (not tied to properties)
    const workers = await workerRepository.getAll();
    for (const worker of workers) {
      await workerRepository.delete(worker.id);
    }
  }

  async getBackupStats(): Promise<BackupManifest['stats']> {
    const [
      properties,
      rooms,
      assets,
      expenses,
      workers,
      maintenanceTasks,
      paintCodes,
      measurements,
      storageBoxes,
      wifiNetworks,
      documents,
      renovations,
      emergencyShutoffs,
      recurringTemplates,
      notes,
    ] = await Promise.all([
      this.getAllProperties(),
      this.getAllRooms(),
      this.getAllAssets(),
      this.getAllExpenses(),
      workerRepository.getAll(),
      this.getAllMaintenanceTasks(),
      this.getAllPaintCodes(),
      this.getAllMeasurements(),
      this.getAllStorageBoxes(),
      this.getAllWifiNetworks(),
      documentRepository.getAll(),
      this.getAllRenovations(),
      this.getAllEmergencyShutoffs(),
      this.getAllRecurringTemplates(),
      this.getAllNotes(),
    ]);

    return {
      properties: properties.length,
      rooms: rooms.length,
      assets: assets.length,
      expenses: expenses.length,
      workers: workers.length,
      maintenanceTasks: maintenanceTasks.length,
      paintCodes: paintCodes.length,
      measurements: measurements.length,
      storageBoxes: storageBoxes.length,
      wifiNetworks: wifiNetworks.length,
      documents: documents.length,
      renovations: renovations.length,
      emergencyShutoffs: emergencyShutoffs.length,
      recurringTemplates: recurringTemplates.length,
      notes: notes.length,
    };
  }
}

export const backupService = new BackupService();
