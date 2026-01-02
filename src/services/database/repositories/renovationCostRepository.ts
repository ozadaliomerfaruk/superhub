import { RenovationCost, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface RenovationCostRow {
  id: string;
  renovation_id: string;
  description: string;
  amount: number;
  category: string | null;
  date: string | null;
  created_at: string;
}

function mapRowToRenovationCost(row: RenovationCostRow): RenovationCost {
  return {
    id: row.id,
    renovationId: row.renovation_id,
    description: row.description,
    amount: row.amount,
    category: row.category || undefined,
    date: row.date || undefined,
    createdAt: row.created_at,
  };
}

export const renovationCostRepository = {
  async getByRenovationId(renovationId: UUID): Promise<RenovationCost[]> {
    const rows = await queryAll<RenovationCostRow>(
      `SELECT * FROM renovation_costs WHERE renovation_id = ? ORDER BY created_at ASC`,
      [renovationId]
    );
    return rows.map(mapRowToRenovationCost);
  },

  async getTotalByRenovationId(renovationId: UUID): Promise<number> {
    const result = await queryFirst<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM renovation_costs WHERE renovation_id = ?',
      [renovationId]
    );
    return result?.total || 0;
  },

  async create(data: Omit<RenovationCost, 'id' | 'createdAt'>): Promise<RenovationCost> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO renovation_costs (id, renovation_id, description, amount, category, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.renovationId, data.description, data.amount, data.category || null, data.date || null, now]
    );

    const result = await queryFirst<RenovationCostRow>(
      'SELECT * FROM renovation_costs WHERE id = ?',
      [id]
    );
    if (!result) throw new Error('Failed to create renovation cost');
    return mapRowToRenovationCost(result);
  },

  async update(id: UUID, data: Partial<Omit<RenovationCost, 'id' | 'renovationId' | 'createdAt'>>): Promise<RenovationCost> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.amount !== undefined) {
      fields.push('amount = ?');
      values.push(data.amount);
    }
    if (data.category !== undefined) {
      fields.push('category = ?');
      values.push(data.category || null);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date || null);
    }

    if (fields.length > 0) {
      values.push(id);
      await execute(
        `UPDATE renovation_costs SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    const result = await queryFirst<RenovationCostRow>(
      'SELECT * FROM renovation_costs WHERE id = ?',
      [id]
    );
    if (!result) throw new Error('Renovation cost not found');
    return mapRowToRenovationCost(result);
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM renovation_costs WHERE id = ?', [id]);
  },

  async deleteByRenovationId(renovationId: UUID): Promise<void> {
    await execute('DELETE FROM renovation_costs WHERE renovation_id = ?', [renovationId]);
  },
};
