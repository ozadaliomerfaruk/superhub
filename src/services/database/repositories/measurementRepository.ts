import { Measurement, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface MeasurementRow {
  id: string;
  property_id: string;
  room_id: string | null;
  asset_id: string | null;
  name: string;
  width: number | null;
  height: number | null;
  depth: number | null;
  unit: string;
  notes: string | null;
  image_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    propertyId: row.property_id,
    roomId: row.room_id || undefined,
    assetId: row.asset_id || undefined,
    name: row.name,
    width: row.width || undefined,
    height: row.height || undefined,
    depth: row.depth || undefined,
    unit: row.unit as Measurement['unit'],
    notes: row.notes || undefined,
    imageUri: row.image_uri || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const measurementRepository = {
  async getByPropertyId(propertyId: UUID): Promise<Measurement[]> {
    const rows = await queryAll<MeasurementRow>(
      'SELECT * FROM measurements WHERE property_id = ? ORDER BY name ASC',
      [propertyId]
    );
    return rows.map(mapRowToMeasurement);
  },

  async getByRoomId(roomId: UUID): Promise<Measurement[]> {
    const rows = await queryAll<MeasurementRow>(
      'SELECT * FROM measurements WHERE room_id = ? ORDER BY name ASC',
      [roomId]
    );
    return rows.map(mapRowToMeasurement);
  },

  async getById(id: UUID): Promise<Measurement | null> {
    const row = await queryFirst<MeasurementRow>(
      'SELECT * FROM measurements WHERE id = ?',
      [id]
    );
    return row ? mapRowToMeasurement(row) : null;
  },

  async create(data: Omit<Measurement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Measurement> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO measurements (id, property_id, room_id, asset_id, name, width, height, depth, unit, notes, image_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.roomId || null,
        data.assetId || null,
        data.name,
        data.width || null,
        data.height || null,
        data.depth || null,
        data.unit,
        data.notes || null,
        data.imageUri || null,
        now,
        now,
      ]
    );

    const measurement = await this.getById(id);
    if (!measurement) throw new Error('Failed to create measurement');
    return measurement;
  },

  async update(id: UUID, data: Partial<Omit<Measurement, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<Measurement> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.roomId !== undefined) {
      fields.push('room_id = ?');
      values.push(data.roomId || null);
    }
    if (data.assetId !== undefined) {
      fields.push('asset_id = ?');
      values.push(data.assetId || null);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.width !== undefined) {
      fields.push('width = ?');
      values.push(data.width || null);
    }
    if (data.height !== undefined) {
      fields.push('height = ?');
      values.push(data.height || null);
    }
    if (data.depth !== undefined) {
      fields.push('depth = ?');
      values.push(data.depth || null);
    }
    if (data.unit !== undefined) {
      fields.push('unit = ?');
      values.push(data.unit);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes || null);
    }
    if (data.imageUri !== undefined) {
      fields.push('image_uri = ?');
      values.push(data.imageUri || null);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE measurements SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const measurement = await this.getById(id);
    if (!measurement) throw new Error('Measurement not found');
    return measurement;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM measurements WHERE id = ?', [id]);
  },
};
