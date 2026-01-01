import { WiFiInfo, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface WiFiInfoRow {
  id: string;
  property_id: string;
  network_name: string;
  password: string;
  is_guest: number;
  qr_code_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToWiFiInfo(row: WiFiInfoRow): WiFiInfo {
  return {
    id: row.id,
    propertyId: row.property_id,
    networkName: row.network_name,
    password: row.password,
    isGuest: row.is_guest === 1,
    qrCodeUri: row.qr_code_uri || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const wifiInfoRepository = {
  async getByPropertyId(propertyId: UUID): Promise<WiFiInfo[]> {
    const rows = await queryAll<WiFiInfoRow>(
      'SELECT * FROM wifi_info WHERE property_id = ? ORDER BY is_guest ASC, network_name ASC',
      [propertyId]
    );
    return rows.map(mapRowToWiFiInfo);
  },

  async getById(id: UUID): Promise<WiFiInfo | null> {
    const row = await queryFirst<WiFiInfoRow>(
      'SELECT * FROM wifi_info WHERE id = ?',
      [id]
    );
    return row ? mapRowToWiFiInfo(row) : null;
  },

  async create(data: Omit<WiFiInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<WiFiInfo> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO wifi_info (id, property_id, network_name, password, is_guest, qr_code_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.networkName,
        data.password,
        data.isGuest ? 1 : 0,
        data.qrCodeUri || null,
        now,
        now,
      ]
    );

    const info = await this.getById(id);
    if (!info) throw new Error('Failed to create WiFi info');
    return info;
  },

  async update(id: UUID, data: Partial<Omit<WiFiInfo, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<WiFiInfo> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.networkName !== undefined) {
      fields.push('network_name = ?');
      values.push(data.networkName);
    }
    if (data.password !== undefined) {
      fields.push('password = ?');
      values.push(data.password);
    }
    if (data.isGuest !== undefined) {
      fields.push('is_guest = ?');
      values.push(data.isGuest ? 1 : 0);
    }
    if (data.qrCodeUri !== undefined) {
      fields.push('qr_code_uri = ?');
      values.push(data.qrCodeUri || null);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE wifi_info SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const info = await this.getById(id);
    if (!info) throw new Error('WiFi info not found');
    return info;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM wifi_info WHERE id = ?', [id]);
  },
};
