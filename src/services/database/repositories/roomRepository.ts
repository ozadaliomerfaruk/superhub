import { Room, UUID, RoomType } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface RoomRow {
  id: string;
  property_id: string;
  name: string;
  type: string;
  image_uri: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToRoom(row: RoomRow): Room {
  return {
    id: row.id,
    propertyId: row.property_id,
    name: row.name,
    type: row.type as RoomType,
    imageUri: row.image_uri || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const roomRepository = {
  async getAll(): Promise<Room[]> {
    const rows = await queryAll<RoomRow>(
      'SELECT * FROM rooms ORDER BY name ASC'
    );
    return rows.map(mapRowToRoom);
  },

  async getByPropertyId(propertyId: UUID): Promise<Room[]> {
    const rows = await queryAll<RoomRow>(
      'SELECT * FROM rooms WHERE property_id = ? ORDER BY name ASC',
      [propertyId]
    );
    return rows.map(mapRowToRoom);
  },

  async getById(id: UUID): Promise<Room | null> {
    const row = await queryFirst<RoomRow>(
      'SELECT * FROM rooms WHERE id = ?',
      [id]
    );
    return row ? mapRowToRoom(row) : null;
  },

  async create(data: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>): Promise<Room> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO rooms (id, property_id, name, type, image_uri, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.propertyId, data.name, data.type, data.imageUri || null, data.notes || null, now, now]
    );

    const room = await this.getById(id);
    if (!room) throw new Error('Failed to create room');
    return room;
  },

  async update(id: UUID, data: Partial<Omit<Room, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<Room> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
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
      `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const room = await this.getById(id);
    if (!room) throw new Error('Room not found');
    return room;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM rooms WHERE id = ?', [id]);
  },

  async countByPropertyId(propertyId: UUID): Promise<number> {
    const result = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM rooms WHERE property_id = ?',
      [propertyId]
    );
    return result?.count ?? 0;
  },
};
