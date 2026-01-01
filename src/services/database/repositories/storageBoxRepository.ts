import { StorageBox, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface StorageBoxRow {
  id: string;
  property_id: string;
  room_id: string | null;
  name: string;
  location: string;
  contents: string;
  image_uri: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToStorageBox(row: StorageBoxRow): StorageBox {
  return {
    id: row.id,
    propertyId: row.property_id,
    roomId: row.room_id || undefined,
    name: row.name,
    location: row.location,
    contents: row.contents,
    imageUri: row.image_uri || undefined,
    qrCode: row.qr_code || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const storageBoxRepository = {
  async getByPropertyId(propertyId: UUID): Promise<StorageBox[]> {
    const rows = await queryAll<StorageBoxRow>(
      'SELECT * FROM storage_boxes WHERE property_id = ? ORDER BY name ASC',
      [propertyId]
    );
    return rows.map(mapRowToStorageBox);
  },

  async getById(id: UUID): Promise<StorageBox | null> {
    const row = await queryFirst<StorageBoxRow>(
      'SELECT * FROM storage_boxes WHERE id = ?',
      [id]
    );
    return row ? mapRowToStorageBox(row) : null;
  },

  async search(propertyId: UUID, query: string): Promise<StorageBox[]> {
    const searchQuery = `%${query}%`;
    const rows = await queryAll<StorageBoxRow>(
      `SELECT * FROM storage_boxes
       WHERE property_id = ? AND (name LIKE ? OR contents LIKE ? OR location LIKE ?)
       ORDER BY name ASC`,
      [propertyId, searchQuery, searchQuery, searchQuery]
    );
    return rows.map(mapRowToStorageBox);
  },

  async create(data: Omit<StorageBox, 'id' | 'createdAt' | 'updatedAt'>): Promise<StorageBox> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO storage_boxes (id, property_id, room_id, name, location, contents, image_uri, qr_code, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.roomId || null,
        data.name,
        data.location,
        data.contents,
        data.imageUri || null,
        data.qrCode || null,
        now,
        now,
      ]
    );

    const box = await this.getById(id);
    if (!box) throw new Error('Failed to create storage box');
    return box;
  },

  async update(id: UUID, data: Partial<Omit<StorageBox, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<StorageBox> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.roomId !== undefined) {
      fields.push('room_id = ?');
      values.push(data.roomId || null);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.location !== undefined) {
      fields.push('location = ?');
      values.push(data.location);
    }
    if (data.contents !== undefined) {
      fields.push('contents = ?');
      values.push(data.contents);
    }
    if (data.imageUri !== undefined) {
      fields.push('image_uri = ?');
      values.push(data.imageUri || null);
    }
    if (data.qrCode !== undefined) {
      fields.push('qr_code = ?');
      values.push(data.qrCode || null);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE storage_boxes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const box = await this.getById(id);
    if (!box) throw new Error('Storage box not found');
    return box;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM storage_boxes WHERE id = ?', [id]);
  },
};
