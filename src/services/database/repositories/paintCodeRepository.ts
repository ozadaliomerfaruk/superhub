import { PaintCode, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface PaintCodeRow {
  id: string;
  property_id: string;
  room_id: string | null;
  location: string;
  brand: string;
  color_name: string;
  color_code: string;
  finish: string | null;
  image_uri: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToPaintCode(row: PaintCodeRow): PaintCode {
  return {
    id: row.id,
    propertyId: row.property_id,
    roomId: row.room_id || undefined,
    location: row.location,
    brand: row.brand,
    colorName: row.color_name,
    colorCode: row.color_code,
    finish: row.finish || undefined,
    imageUri: row.image_uri || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const paintCodeRepository = {
  async getByPropertyId(propertyId: UUID): Promise<PaintCode[]> {
    const rows = await queryAll<PaintCodeRow>(
      'SELECT * FROM paint_codes WHERE property_id = ? ORDER BY location ASC',
      [propertyId]
    );
    return rows.map(mapRowToPaintCode);
  },

  async getByRoomId(roomId: UUID): Promise<PaintCode[]> {
    const rows = await queryAll<PaintCodeRow>(
      'SELECT * FROM paint_codes WHERE room_id = ? ORDER BY location ASC',
      [roomId]
    );
    return rows.map(mapRowToPaintCode);
  },

  async getById(id: UUID): Promise<PaintCode | null> {
    const row = await queryFirst<PaintCodeRow>(
      'SELECT * FROM paint_codes WHERE id = ?',
      [id]
    );
    return row ? mapRowToPaintCode(row) : null;
  },

  async create(data: Omit<PaintCode, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaintCode> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO paint_codes (id, property_id, room_id, location, brand, color_name, color_code, finish, image_uri, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.roomId || null,
        data.location,
        data.brand,
        data.colorName,
        data.colorCode,
        data.finish || null,
        data.imageUri || null,
        data.notes || null,
        now,
        now,
      ]
    );

    const paintCode = await this.getById(id);
    if (!paintCode) throw new Error('Failed to create paint code');
    return paintCode;
  },

  async update(id: UUID, data: Partial<Omit<PaintCode, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<PaintCode> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.roomId !== undefined) {
      fields.push('room_id = ?');
      values.push(data.roomId || null);
    }
    if (data.location !== undefined) {
      fields.push('location = ?');
      values.push(data.location);
    }
    if (data.brand !== undefined) {
      fields.push('brand = ?');
      values.push(data.brand);
    }
    if (data.colorName !== undefined) {
      fields.push('color_name = ?');
      values.push(data.colorName);
    }
    if (data.colorCode !== undefined) {
      fields.push('color_code = ?');
      values.push(data.colorCode);
    }
    if (data.finish !== undefined) {
      fields.push('finish = ?');
      values.push(data.finish || null);
    }
    if (data.imageUri !== undefined) {
      fields.push('image_uri = ?');
      values.push(data.imageUri || null);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes || null);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE paint_codes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const paintCode = await this.getById(id);
    if (!paintCode) throw new Error('Paint code not found');
    return paintCode;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM paint_codes WHERE id = ?', [id]);
  },
};
