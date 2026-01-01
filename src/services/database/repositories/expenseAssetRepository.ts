import { ExpenseAsset, ExpenseAssetWithDetails, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface ExpenseAssetRow {
  id: string;
  expense_id: string;
  asset_id: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

interface ExpenseAssetWithDetailsRow extends ExpenseAssetRow {
  asset_name: string;
  asset_category: string;
  asset_brand: string | null;
  asset_model: string | null;
}

function mapRowToExpenseAsset(row: ExpenseAssetRow): ExpenseAsset {
  return {
    id: row.id,
    expenseId: row.expense_id,
    assetId: row.asset_id,
    amount: row.amount,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

function mapRowToExpenseAssetWithDetails(row: ExpenseAssetWithDetailsRow): ExpenseAssetWithDetails {
  return {
    id: row.id,
    expenseId: row.expense_id,
    assetId: row.asset_id,
    amount: row.amount,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    assetName: row.asset_name,
    assetCategory: row.asset_category as ExpenseAssetWithDetails['assetCategory'],
    assetBrand: row.asset_brand || undefined,
    assetModel: row.asset_model || undefined,
  };
}

export const expenseAssetRepository = {
  async getByExpenseId(expenseId: UUID): Promise<ExpenseAsset[]> {
    const rows = await queryAll<ExpenseAssetRow>(
      'SELECT * FROM expense_assets WHERE expense_id = ? ORDER BY created_at ASC',
      [expenseId]
    );
    return rows.map(mapRowToExpenseAsset);
  },

  async getByExpenseIdWithDetails(expenseId: UUID): Promise<ExpenseAssetWithDetails[]> {
    const rows = await queryAll<ExpenseAssetWithDetailsRow>(
      `SELECT ea.*, a.name as asset_name, a.category as asset_category, a.brand as asset_brand, a.model as asset_model
       FROM expense_assets ea
       JOIN assets a ON ea.asset_id = a.id
       WHERE ea.expense_id = ?
       ORDER BY ea.created_at ASC`,
      [expenseId]
    );
    return rows.map(mapRowToExpenseAssetWithDetails);
  },

  async getByAssetId(assetId: UUID): Promise<ExpenseAsset[]> {
    const rows = await queryAll<ExpenseAssetRow>(
      'SELECT * FROM expense_assets WHERE asset_id = ? ORDER BY created_at DESC',
      [assetId]
    );
    return rows.map(mapRowToExpenseAsset);
  },

  async getTotalSpentOnAsset(assetId: UUID): Promise<number> {
    const result = await queryFirst<{ total: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expense_assets WHERE asset_id = ?',
      [assetId]
    );
    return result?.total ?? 0;
  },

  async create(data: Omit<ExpenseAsset, 'id' | 'createdAt'>): Promise<ExpenseAsset> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO expense_assets (id, expense_id, asset_id, amount, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.expenseId,
        data.assetId,
        data.amount,
        data.notes || null,
        now,
      ]
    );

    const row = await queryFirst<ExpenseAssetRow>(
      'SELECT * FROM expense_assets WHERE id = ?',
      [id]
    );
    if (!row) throw new Error('Failed to create expense asset');
    return mapRowToExpenseAsset(row);
  },

  async createMany(expenseId: UUID, assets: Array<{ assetId: UUID; amount: number; notes?: string }>): Promise<ExpenseAsset[]> {
    const results: ExpenseAsset[] = [];
    for (const asset of assets) {
      const result = await this.create({
        expenseId,
        assetId: asset.assetId,
        amount: asset.amount,
        notes: asset.notes,
      });
      results.push(result);
    }
    return results;
  },

  async update(id: UUID, data: Partial<Pick<ExpenseAsset, 'amount' | 'notes'>>): Promise<ExpenseAsset> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.amount !== undefined) {
      fields.push('amount = ?');
      values.push(data.amount);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes || null);
    }

    if (fields.length === 0) {
      const existing = await queryFirst<ExpenseAssetRow>(
        'SELECT * FROM expense_assets WHERE id = ?',
        [id]
      );
      if (!existing) throw new Error('Expense asset not found');
      return mapRowToExpenseAsset(existing);
    }

    values.push(id);

    await execute(
      `UPDATE expense_assets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const row = await queryFirst<ExpenseAssetRow>(
      'SELECT * FROM expense_assets WHERE id = ?',
      [id]
    );
    if (!row) throw new Error('Expense asset not found');
    return mapRowToExpenseAsset(row);
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM expense_assets WHERE id = ?', [id]);
  },

  async deleteByExpenseId(expenseId: UUID): Promise<void> {
    await execute('DELETE FROM expense_assets WHERE expense_id = ?', [expenseId]);
  },

  async deleteByAssetId(assetId: UUID): Promise<void> {
    await execute('DELETE FROM expense_assets WHERE asset_id = ?', [assetId]);
  },

  async replaceForExpense(expenseId: UUID, assets: Array<{ assetId: UUID; amount: number; notes?: string }>): Promise<ExpenseAsset[]> {
    // Delete existing associations
    await this.deleteByExpenseId(expenseId);
    // Create new associations
    if (assets.length > 0) {
      return this.createMany(expenseId, assets);
    }
    return [];
  },
};
