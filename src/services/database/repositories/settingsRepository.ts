import { AppSettings } from '../../../types';
import { queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';

// Inline function to avoid circular dependency with date.ts
function getCurrentISODate(): string {
  return new Date().toISOString();
}

interface SettingsRow {
  id: string;
  theme: string;
  currency: string;
  date_format: string;
  biometric_enabled: number;
  photo_quality: string;
  encrypt_exports: number;
  created_at: string;
  updated_at: string;
}

function mapRowToSettings(row: SettingsRow): AppSettings {
  return {
    id: row.id,
    theme: row.theme as AppSettings['theme'],
    currency: row.currency,
    dateFormat: row.date_format,
    biometricEnabled: row.biometric_enabled === 1,
    photoQuality: row.photo_quality as AppSettings['photoQuality'],
    encryptExports: row.encrypt_exports === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DEFAULT_SETTINGS: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  theme: 'system',
  currency: 'USD',
  dateFormat: 'MM/dd/yyyy',
  biometricEnabled: false,
  photoQuality: 'high',
  encryptExports: false,
};

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    const row = await queryFirst<SettingsRow>(
      'SELECT * FROM app_settings LIMIT 1'
    );

    if (row) {
      return mapRowToSettings(row);
    }

    // Create default settings if none exist
    return this.create(DEFAULT_SETTINGS);
  },

  async create(data: Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppSettings> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO app_settings (id, theme, currency, date_format, biometric_enabled, photo_quality, encrypt_exports, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.theme,
        data.currency,
        data.dateFormat,
        data.biometricEnabled ? 1 : 0,
        data.photoQuality,
        data.encryptExports ? 1 : 0,
        now,
        now,
      ]
    );

    const settings = await queryFirst<SettingsRow>(
      'SELECT * FROM app_settings WHERE id = ?',
      [id]
    );
    if (!settings) throw new Error('Failed to create settings');
    return mapRowToSettings(settings);
  },

  async update(data: Partial<Omit<AppSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AppSettings> {
    const current = await this.get();
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.theme !== undefined) {
      fields.push('theme = ?');
      values.push(data.theme);
    }
    if (data.currency !== undefined) {
      fields.push('currency = ?');
      values.push(data.currency);
    }
    if (data.dateFormat !== undefined) {
      fields.push('date_format = ?');
      values.push(data.dateFormat);
    }
    if (data.biometricEnabled !== undefined) {
      fields.push('biometric_enabled = ?');
      values.push(data.biometricEnabled ? 1 : 0);
    }
    if (data.photoQuality !== undefined) {
      fields.push('photo_quality = ?');
      values.push(data.photoQuality);
    }
    if (data.encryptExports !== undefined) {
      fields.push('encrypt_exports = ?');
      values.push(data.encryptExports ? 1 : 0);
    }

    if (fields.length === 0) {
      return current;
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(current.id);

    await execute(
      `UPDATE app_settings SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.get();
  },

  async setTheme(theme: AppSettings['theme']): Promise<void> {
    await this.update({ theme });
  },

  async setCurrency(currency: string): Promise<void> {
    await this.update({ currency });
  },

  async setDateFormat(dateFormat: string): Promise<void> {
    await this.update({ dateFormat });
  },

  async setPhotoQuality(photoQuality: AppSettings['photoQuality']): Promise<void> {
    await this.update({ photoQuality });
  },

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await this.update({ biometricEnabled: enabled });
  },

  async setEncryptExports(enabled: boolean): Promise<void> {
    await this.update({ encryptExports: enabled });
  },
};
