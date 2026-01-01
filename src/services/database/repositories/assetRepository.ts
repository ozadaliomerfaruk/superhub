import { Asset, UUID, AssetCategory } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface AssetRow {
  id: string;
  property_id: string;
  room_id: string | null;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  warranty_end_date: string | null;
  notes: string | null;
  image_uri: string | null;
  manual_uri: string | null;
  created_at: string;
  updated_at: string;
}

function mapRowToAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    propertyId: row.property_id,
    roomId: row.room_id || undefined,
    name: row.name,
    category: row.category as AssetCategory,
    brand: row.brand || undefined,
    model: row.model || undefined,
    serialNumber: row.serial_number || undefined,
    purchaseDate: row.purchase_date || undefined,
    purchasePrice: row.purchase_price || undefined,
    warrantyEndDate: row.warranty_end_date || undefined,
    notes: row.notes || undefined,
    imageUri: row.image_uri || undefined,
    manualUri: row.manual_uri || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const assetRepository = {
  async getAll(): Promise<Asset[]> {
    const rows = await queryAll<AssetRow>(
      'SELECT * FROM assets ORDER BY name ASC'
    );
    return rows.map(mapRowToAsset);
  },

  async getByPropertyId(propertyId: UUID): Promise<Asset[]> {
    const rows = await queryAll<AssetRow>(
      'SELECT * FROM assets WHERE property_id = ? ORDER BY name ASC',
      [propertyId]
    );
    return rows.map(mapRowToAsset);
  },

  async getByRoomId(roomId: UUID): Promise<Asset[]> {
    const rows = await queryAll<AssetRow>(
      'SELECT * FROM assets WHERE room_id = ? ORDER BY name ASC',
      [roomId]
    );
    return rows.map(mapRowToAsset);
  },

  async getById(id: UUID): Promise<Asset | null> {
    const row = await queryFirst<AssetRow>(
      'SELECT * FROM assets WHERE id = ?',
      [id]
    );
    return row ? mapRowToAsset(row) : null;
  },

  async getByCategory(propertyId: UUID, category: AssetCategory): Promise<Asset[]> {
    const rows = await queryAll<AssetRow>(
      'SELECT * FROM assets WHERE property_id = ? AND category = ? ORDER BY name ASC',
      [propertyId, category]
    );
    return rows.map(mapRowToAsset);
  },

  async getWithExpiringWarranty(propertyId: UUID, daysAhead: number = 30): Promise<Asset[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const rows = await queryAll<AssetRow>(
      `SELECT * FROM assets
       WHERE property_id = ?
       AND warranty_end_date IS NOT NULL
       AND warranty_end_date <= ?
       AND warranty_end_date >= date('now')
       ORDER BY warranty_end_date ASC`,
      [propertyId, futureDate.toISOString()]
    );
    return rows.map(mapRowToAsset);
  },

  async create(data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO assets (id, property_id, room_id, name, category, brand, model, serial_number, purchase_date, purchase_price, warranty_end_date, notes, image_uri, manual_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.roomId || null,
        data.name,
        data.category,
        data.brand || null,
        data.model || null,
        data.serialNumber || null,
        data.purchaseDate || null,
        data.purchasePrice || null,
        data.warrantyEndDate || null,
        data.notes || null,
        data.imageUri || null,
        data.manualUri || null,
        now,
        now,
      ]
    );

    const asset = await this.getById(id);
    if (!asset) throw new Error('Failed to create asset');
    return asset;
  },

  async update(id: UUID, data: Partial<Omit<Asset, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<Asset> {
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
    if (data.category !== undefined) {
      fields.push('category = ?');
      values.push(data.category);
    }
    if (data.brand !== undefined) {
      fields.push('brand = ?');
      values.push(data.brand || null);
    }
    if (data.model !== undefined) {
      fields.push('model = ?');
      values.push(data.model || null);
    }
    if (data.serialNumber !== undefined) {
      fields.push('serial_number = ?');
      values.push(data.serialNumber || null);
    }
    if (data.purchaseDate !== undefined) {
      fields.push('purchase_date = ?');
      values.push(data.purchaseDate || null);
    }
    if (data.purchasePrice !== undefined) {
      fields.push('purchase_price = ?');
      values.push(data.purchasePrice || null);
    }
    if (data.warrantyEndDate !== undefined) {
      fields.push('warranty_end_date = ?');
      values.push(data.warrantyEndDate || null);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes || null);
    }
    if (data.imageUri !== undefined) {
      fields.push('image_uri = ?');
      values.push(data.imageUri || null);
    }
    if (data.manualUri !== undefined) {
      fields.push('manual_uri = ?');
      values.push(data.manualUri || null);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE assets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const asset = await this.getById(id);
    if (!asset) throw new Error('Asset not found');
    return asset;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM assets WHERE id = ?', [id]);
  },

  async countByPropertyId(propertyId: UUID): Promise<number> {
    const result = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM assets WHERE property_id = ?',
      [propertyId]
    );
    return result?.count ?? 0;
  },

  async countByRoomId(roomId: UUID): Promise<number> {
    const result = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM assets WHERE room_id = ?',
      [roomId]
    );
    return result?.count ?? 0;
  },

  async getTotalValueByPropertyId(propertyId: UUID): Promise<number> {
    const result = await queryFirst<{ total: number }>(
      'SELECT COALESCE(SUM(purchase_price), 0) as total FROM assets WHERE property_id = ?',
      [propertyId]
    );
    return result?.total ?? 0;
  },

  async search(propertyId: UUID, query: string): Promise<Asset[]> {
    const searchQuery = `%${query}%`;
    const rows = await queryAll<AssetRow>(
      `SELECT * FROM assets
       WHERE property_id = ? AND (name LIKE ? OR brand LIKE ? OR model LIKE ?)
       ORDER BY name ASC`,
      [propertyId, searchQuery, searchQuery, searchQuery]
    );
    return rows.map(mapRowToAsset);
  },

  async getAllWithExpiringWarranty(daysAhead: number = 30): Promise<Asset[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const rows = await queryAll<AssetRow>(
      `SELECT * FROM assets
       WHERE warranty_end_date IS NOT NULL
       AND warranty_end_date <= ?
       AND warranty_end_date >= date('now')
       ORDER BY warranty_end_date ASC`,
      [futureDate.toISOString()]
    );
    return rows.map(mapRowToAsset);
  },

  async getAllWithExpiredWarranty(): Promise<Asset[]> {
    const rows = await queryAll<AssetRow>(
      `SELECT * FROM assets
       WHERE warranty_end_date IS NOT NULL
       AND warranty_end_date < date('now')
       ORDER BY warranty_end_date DESC`
    );
    return rows.map(mapRowToAsset);
  },
};
