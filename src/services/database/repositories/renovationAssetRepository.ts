import { RenovationAsset, RenovationAssetWithDetails, UUID, AssetCategory } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface RenovationAssetRow {
  id: string;
  renovation_id: string;
  asset_id: string;
  notes: string | null;
  created_at: string;
}

interface RenovationAssetWithDetailsRow extends RenovationAssetRow {
  asset_name: string;
  asset_category: string;
  asset_brand: string | null;
}

function mapRowToRenovationAsset(row: RenovationAssetRow): RenovationAsset {
  return {
    id: row.id,
    renovationId: row.renovation_id,
    assetId: row.asset_id,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

function mapRowToRenovationAssetWithDetails(row: RenovationAssetWithDetailsRow): RenovationAssetWithDetails {
  return {
    ...mapRowToRenovationAsset(row),
    assetName: row.asset_name,
    assetCategory: row.asset_category as AssetCategory,
    assetBrand: row.asset_brand || undefined,
  };
}

export const renovationAssetRepository = {
  async getByRenovationId(renovationId: UUID): Promise<RenovationAssetWithDetails[]> {
    const rows = await queryAll<RenovationAssetWithDetailsRow>(
      `SELECT ra.*, a.name as asset_name, a.category as asset_category, a.brand as asset_brand
       FROM renovation_assets ra
       JOIN assets a ON ra.asset_id = a.id
       WHERE ra.renovation_id = ?
       ORDER BY ra.created_at ASC`,
      [renovationId]
    );
    return rows.map(mapRowToRenovationAssetWithDetails);
  },

  async create(data: Omit<RenovationAsset, 'id' | 'createdAt'>): Promise<RenovationAsset> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO renovation_assets (id, renovation_id, asset_id, notes, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.renovationId, data.assetId, data.notes || null, now]
    );

    const result = await queryFirst<RenovationAssetRow>(
      'SELECT * FROM renovation_assets WHERE id = ?',
      [id]
    );
    if (!result) throw new Error('Failed to create renovation asset');
    return mapRowToRenovationAsset(result);
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM renovation_assets WHERE id = ?', [id]);
  },

  async deleteByRenovationId(renovationId: UUID): Promise<void> {
    await execute('DELETE FROM renovation_assets WHERE renovation_id = ?', [renovationId]);
  },
};
