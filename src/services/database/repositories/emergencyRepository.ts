import { EmergencyShutoff, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface EmergencyRow {
  id: string;
  property_id: string;
  type: string;
  location: string;
  instructions: string | null;
  image_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToEmergency(row: EmergencyRow): EmergencyShutoff {
  return {
    id: row.id,
    propertyId: row.property_id,
    type: row.type as 'water' | 'gas' | 'electrical' | 'hvac',
    location: row.location,
    instructions: row.instructions || undefined,
    imageUri: row.image_uri || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const emergencyRepository = {
  async getByPropertyId(propertyId: UUID): Promise<EmergencyShutoff[]> {
    const rows = await queryAll<EmergencyRow>(
      'SELECT * FROM emergency_shutoffs WHERE property_id = ? ORDER BY type ASC',
      [propertyId]
    );
    return rows.map(mapRowToEmergency);
  },

  async getById(id: UUID): Promise<EmergencyShutoff | null> {
    const row = await queryFirst<EmergencyRow>(
      'SELECT * FROM emergency_shutoffs WHERE id = ?',
      [id]
    );
    return row ? mapRowToEmergency(row) : null;
  },

  async create(data: Omit<EmergencyShutoff, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmergencyShutoff> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO emergency_shutoffs (id, property_id, type, location, instructions, image_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.type,
        data.location,
        data.instructions || null,
        data.imageUri || null,
        now,
        now,
      ]
    );

    const emergency = await this.getById(id);
    if (!emergency) throw new Error('Failed to create emergency shutoff');
    return emergency;
  },

  async update(id: UUID, data: Partial<Omit<EmergencyShutoff, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<EmergencyShutoff> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.location !== undefined) {
      fields.push('location = ?');
      values.push(data.location);
    }
    if (data.instructions !== undefined) {
      fields.push('instructions = ?');
      values.push(data.instructions || null);
    }
    if (data.imageUri !== undefined) {
      fields.push('image_uri = ?');
      values.push(data.imageUri || null);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE emergency_shutoffs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const emergency = await this.getById(id);
    if (!emergency) throw new Error('Emergency shutoff not found');
    return emergency;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM emergency_shutoffs WHERE id = ?', [id]);
  },
};
