import { Property, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface PropertyRow {
  id: string;
  name: string;
  address: string;
  type: string;
  image_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.type as Property['type'],
    imageUri: row.image_uri || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const propertyRepository = {
  async getAll(): Promise<Property[]> {
    const rows = await queryAll<PropertyRow>(
      'SELECT * FROM properties ORDER BY created_at DESC'
    );
    return rows.map(mapRowToProperty);
  },

  async getById(id: UUID): Promise<Property | null> {
    const row = await queryFirst<PropertyRow>(
      'SELECT * FROM properties WHERE id = ?',
      [id]
    );
    return row ? mapRowToProperty(row) : null;
  },

  async create(data: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<Property> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO properties (id, name, address, type, image_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.address, data.type, data.imageUri || null, now, now]
    );

    const property = await this.getById(id);
    if (!property) throw new Error('Failed to create property');
    return property;
  },

  async update(id: UUID, data: Partial<Omit<Property, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Property> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.address !== undefined) {
      fields.push('address = ?');
      values.push(data.address);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.imageUri !== undefined) {
      fields.push('image_uri = ?');
      values.push(data.imageUri || null);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE properties SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const property = await this.getById(id);
    if (!property) throw new Error('Property not found');
    return property;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM properties WHERE id = ?', [id]);
  },

  async count(): Promise<number> {
    const result = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM properties'
    );
    return result?.count ?? 0;
  },
};
