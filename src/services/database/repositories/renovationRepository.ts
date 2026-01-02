import { Renovation, RenovationWithDetails, UUID, ExpenseType } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';
import { renovationWorkerRepository } from './renovationWorkerRepository';
import { renovationAssetRepository } from './renovationAssetRepository';
import { renovationCostRepository } from './renovationCostRepository';

interface RenovationRow {
  id: string;
  property_id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  before_image_uri: string;
  after_image_uri: string | null;
  completed_date: string | null;
  cost: number | null;
  expense_type: string | null;
  created_at: string;
  updated_at: string;
}

interface RenovationWithRoomRow extends RenovationRow {
  room_name: string | null;
}

function mapRowToRenovation(row: RenovationRow): Renovation {
  return {
    id: row.id,
    propertyId: row.property_id,
    roomId: row.room_id || undefined,
    title: row.title,
    description: row.description || undefined,
    beforeImageUri: row.before_image_uri,
    afterImageUri: row.after_image_uri || undefined,
    completedDate: row.completed_date || undefined,
    cost: row.cost || undefined,
    expenseType: (row.expense_type as ExpenseType) || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const renovationRepository = {
  async getAll(): Promise<Renovation[]> {
    const rows = await queryAll<RenovationRow>(
      'SELECT * FROM renovations ORDER BY created_at DESC'
    );
    return rows.map(mapRowToRenovation);
  },

  async getByPropertyId(propertyId: UUID): Promise<Renovation[]> {
    const rows = await queryAll<RenovationRow>(
      'SELECT * FROM renovations WHERE property_id = ? ORDER BY created_at DESC',
      [propertyId]
    );
    return rows.map(mapRowToRenovation);
  },

  async getByRoomId(roomId: UUID): Promise<Renovation[]> {
    const rows = await queryAll<RenovationRow>(
      'SELECT * FROM renovations WHERE room_id = ? ORDER BY created_at DESC',
      [roomId]
    );
    return rows.map(mapRowToRenovation);
  },

  async getById(id: UUID): Promise<Renovation | null> {
    const row = await queryFirst<RenovationRow>(
      'SELECT * FROM renovations WHERE id = ?',
      [id]
    );
    return row ? mapRowToRenovation(row) : null;
  },

  async getCompleted(propertyId: UUID): Promise<Renovation[]> {
    const rows = await queryAll<RenovationRow>(
      'SELECT * FROM renovations WHERE property_id = ? AND after_image_uri IS NOT NULL ORDER BY completed_date DESC',
      [propertyId]
    );
    return rows.map(mapRowToRenovation);
  },

  async getInProgress(propertyId: UUID): Promise<Renovation[]> {
    const rows = await queryAll<RenovationRow>(
      'SELECT * FROM renovations WHERE property_id = ? AND after_image_uri IS NULL ORDER BY created_at DESC',
      [propertyId]
    );
    return rows.map(mapRowToRenovation);
  },

  async create(data: Omit<Renovation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Renovation> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO renovations (id, property_id, room_id, title, description, before_image_uri, after_image_uri, completed_date, cost, expense_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.roomId || null,
        data.title,
        data.description || null,
        data.beforeImageUri,
        data.afterImageUri || null,
        data.completedDate || null,
        data.cost || null,
        data.expenseType || null,
        now,
        now,
      ]
    );

    const renovation = await this.getById(id);
    if (!renovation) throw new Error('Failed to create renovation');
    return renovation;
  },

  async update(id: UUID, data: Partial<Omit<Renovation, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<Renovation> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.roomId !== undefined) {
      fields.push('room_id = ?');
      values.push(data.roomId || null);
    }
    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description || null);
    }
    if (data.beforeImageUri !== undefined) {
      fields.push('before_image_uri = ?');
      values.push(data.beforeImageUri);
    }
    if (data.afterImageUri !== undefined) {
      fields.push('after_image_uri = ?');
      values.push(data.afterImageUri || null);
    }
    if (data.completedDate !== undefined) {
      fields.push('completed_date = ?');
      values.push(data.completedDate || null);
    }
    if (data.cost !== undefined) {
      fields.push('cost = ?');
      values.push(data.cost || null);
    }
    if (data.expenseType !== undefined) {
      fields.push('expense_type = ?');
      values.push(data.expenseType || null);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE renovations SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const renovation = await this.getById(id);
    if (!renovation) throw new Error('Renovation not found');
    return renovation;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM renovations WHERE id = ?', [id]);
  },

  async getTotalCostByPropertyId(propertyId: UUID): Promise<number> {
    const result = await queryFirst<{ total: number }>(
      'SELECT COALESCE(SUM(cost), 0) as total FROM renovations WHERE property_id = ?',
      [propertyId]
    );
    return result?.total || 0;
  },

  async getByIdWithDetails(id: UUID): Promise<RenovationWithDetails | null> {
    const row = await queryFirst<RenovationWithRoomRow>(
      `SELECT r.*, rm.name as room_name
       FROM renovations r
       LEFT JOIN rooms rm ON r.room_id = rm.id
       WHERE r.id = ?`,
      [id]
    );
    if (!row) return null;

    const [workers, assets, costs] = await Promise.all([
      renovationWorkerRepository.getByRenovationId(id),
      renovationAssetRepository.getByRenovationId(id),
      renovationCostRepository.getByRenovationId(id),
    ]);

    const totalCost = costs.reduce((sum, c) => sum + c.amount, 0) + (row.cost || 0);

    return {
      ...mapRowToRenovation(row),
      roomName: row.room_name || undefined,
      workers,
      assets,
      costs,
      totalCost,
    };
  },

  async getByPropertyIdWithDetails(propertyId: UUID): Promise<RenovationWithDetails[]> {
    const rows = await queryAll<RenovationWithRoomRow>(
      `SELECT r.*, rm.name as room_name
       FROM renovations r
       LEFT JOIN rooms rm ON r.room_id = rm.id
       WHERE r.property_id = ?
       ORDER BY r.created_at DESC`,
      [propertyId]
    );

    const results: RenovationWithDetails[] = [];
    for (const row of rows) {
      const [workers, assets, costs] = await Promise.all([
        renovationWorkerRepository.getByRenovationId(row.id),
        renovationAssetRepository.getByRenovationId(row.id),
        renovationCostRepository.getByRenovationId(row.id),
      ]);

      const totalCost = costs.reduce((sum, c) => sum + c.amount, 0) + (row.cost || 0);

      results.push({
        ...mapRowToRenovation(row),
        roomName: row.room_name || undefined,
        workers,
        assets,
        costs,
        totalCost,
      });
    }

    return results;
  },
};
