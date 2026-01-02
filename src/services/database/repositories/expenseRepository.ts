import { Expense, UUID, ExpenseType } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface ExpenseRow {
  id: string;
  property_id: string;
  room_id: string | null;
  asset_id: string | null;
  worker_id: string | null;
  type: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  receipt_uri: string | null;
  is_recurring: number;
  recurring_template_id: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

function mapRowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    propertyId: row.property_id,
    roomId: row.room_id || undefined,
    assetId: row.asset_id || undefined,
    workerId: row.worker_id || undefined,
    type: row.type as ExpenseType,
    category: row.category,
    amount: row.amount,
    date: row.date,
    description: row.description,
    receiptUri: row.receipt_uri || undefined,
    isRecurring: row.is_recurring === 1,
    recurringTemplateId: row.recurring_template_id || undefined,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const expenseRepository = {
  async getAll(): Promise<Expense[]> {
    const rows = await queryAll<ExpenseRow>(
      'SELECT * FROM expenses ORDER BY date DESC'
    );
    return rows.map(mapRowToExpense);
  },

  async getByPropertyId(propertyId: UUID, limit?: number): Promise<Expense[]> {
    const sql = limit
      ? 'SELECT * FROM expenses WHERE property_id = ? ORDER BY date DESC LIMIT ?'
      : 'SELECT * FROM expenses WHERE property_id = ? ORDER BY date DESC';
    const params = limit ? [propertyId, limit] : [propertyId];
    const rows = await queryAll<ExpenseRow>(sql, params);
    return rows.map(mapRowToExpense);
  },

  async getByRoomId(roomId: UUID): Promise<Expense[]> {
    const rows = await queryAll<ExpenseRow>(
      'SELECT * FROM expenses WHERE room_id = ? ORDER BY date DESC',
      [roomId]
    );
    return rows.map(mapRowToExpense);
  },

  async getById(id: UUID): Promise<Expense | null> {
    const row = await queryFirst<ExpenseRow>(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );
    return row ? mapRowToExpense(row) : null;
  },

  async getRecentByPropertyId(propertyId: UUID, days: number = 30): Promise<Expense[]> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    const rows = await queryAll<ExpenseRow>(
      `SELECT * FROM expenses
       WHERE property_id = ? AND date >= ?
       ORDER BY date DESC`,
      [propertyId, dateThreshold.toISOString()]
    );
    return rows.map(mapRowToExpense);
  },

  async create(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO expenses (id, property_id, room_id, asset_id, worker_id, type, category, amount, date, description, receipt_uri, is_recurring, recurring_template_id, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.roomId || null,
        data.assetId || null,
        data.workerId || null,
        data.type,
        data.category,
        data.amount,
        data.date,
        data.description,
        data.receiptUri || null,
        data.isRecurring ? 1 : 0,
        data.recurringTemplateId || null,
        JSON.stringify(data.tags || []),
        now,
        now,
      ]
    );

    const expense = await this.getById(id);
    if (!expense) throw new Error('Failed to create expense');
    return expense;
  },

  async update(id: UUID, data: Partial<Omit<Expense, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<Expense> {
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
    if (data.workerId !== undefined) {
      fields.push('worker_id = ?');
      values.push(data.workerId || null);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.category !== undefined) {
      fields.push('category = ?');
      values.push(data.category);
    }
    if (data.amount !== undefined) {
      fields.push('amount = ?');
      values.push(data.amount);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.receiptUri !== undefined) {
      fields.push('receipt_uri = ?');
      values.push(data.receiptUri || null);
    }
    if (data.isRecurring !== undefined) {
      fields.push('is_recurring = ?');
      values.push(data.isRecurring ? 1 : 0);
    }
    if (data.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(data.tags));
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const expense = await this.getById(id);
    if (!expense) throw new Error('Expense not found');
    return expense;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM expenses WHERE id = ?', [id]);
  },

  async getTotalByPropertyId(propertyId: UUID): Promise<number> {
    const result = await queryFirst<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE property_id = ?',
      [propertyId]
    );
    return result?.total ?? 0;
  },

  async getMonthlyTotalByPropertyId(propertyId: UUID, year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const result = await queryFirst<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE property_id = ? AND date >= ? AND date <= ?`,
      [propertyId, startDate, endDate]
    );
    return result?.total ?? 0;
  },

  async getByWorkerId(workerId: UUID): Promise<Expense[]> {
    const rows = await queryAll<ExpenseRow>(
      'SELECT * FROM expenses WHERE worker_id = ? ORDER BY date DESC',
      [workerId]
    );
    return rows.map(mapRowToExpense);
  },

  async getTotalByWorkerId(workerId: UUID): Promise<number> {
    const result = await queryFirst<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE worker_id = ?',
      [workerId]
    );
    return result?.total ?? 0;
  },

  async getByAssetId(assetId: UUID): Promise<Expense[]> {
    const rows = await queryAll<ExpenseRow>(
      'SELECT * FROM expenses WHERE asset_id = ? ORDER BY date DESC',
      [assetId]
    );
    return rows.map(mapRowToExpense);
  },

  async getMonthlyTotal(year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const result = await queryFirst<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE date >= ? AND date <= ?`,
      [startDate, endDate]
    );
    return result?.total ?? 0;
  },
};
