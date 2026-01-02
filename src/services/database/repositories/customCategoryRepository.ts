import { CustomCategory, CustomCategoryType, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface CustomCategoryRow {
  id: string;
  type: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapRowToCustomCategory(row: CustomCategoryRow): CustomCategory {
  return {
    id: row.id,
    type: row.type as CustomCategoryType,
    name: row.name,
    icon: row.icon || undefined,
    color: row.color || undefined,
    isDefault: row.is_default === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const customCategoryRepository = {
  async getAll(): Promise<CustomCategory[]> {
    const rows = await queryAll<CustomCategoryRow>(
      'SELECT * FROM custom_categories ORDER BY type, sort_order, name'
    );
    return rows.map(mapRowToCustomCategory);
  },

  async getByType(type: CustomCategoryType): Promise<CustomCategory[]> {
    const rows = await queryAll<CustomCategoryRow>(
      'SELECT * FROM custom_categories WHERE type = ? ORDER BY sort_order, name',
      [type]
    );
    return rows.map(mapRowToCustomCategory);
  },

  async getById(id: UUID): Promise<CustomCategory | null> {
    const row = await queryFirst<CustomCategoryRow>(
      'SELECT * FROM custom_categories WHERE id = ?',
      [id]
    );
    return row ? mapRowToCustomCategory(row) : null;
  },

  async create(data: Omit<CustomCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomCategory> {
    const id = generateUUID();
    const now = getCurrentISODate();

    // Get max sort_order for this type
    const maxOrder = await queryFirst<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM custom_categories WHERE type = ?',
      [data.type]
    );
    const sortOrder = data.sortOrder ?? ((maxOrder?.max_order ?? -1) + 1);

    await execute(
      `INSERT INTO custom_categories (id, type, name, icon, color, is_default, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.type,
        data.name,
        data.icon || null,
        data.color || null,
        data.isDefault ? 1 : 0,
        sortOrder,
        now,
        now,
      ]
    );

    const result = await queryFirst<CustomCategoryRow>(
      'SELECT * FROM custom_categories WHERE id = ?',
      [id]
    );
    if (!result) throw new Error('Failed to create custom category');
    return mapRowToCustomCategory(result);
  },

  async update(
    id: UUID,
    data: Partial<Omit<CustomCategory, 'id' | 'type' | 'createdAt' | 'updatedAt'>>
  ): Promise<CustomCategory> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.icon !== undefined) {
      fields.push('icon = ?');
      values.push(data.icon || null);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color || null);
    }
    if (data.isDefault !== undefined) {
      fields.push('is_default = ?');
      values.push(data.isDefault ? 1 : 0);
    }
    if (data.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      values.push(data.sortOrder);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE custom_categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const result = await queryFirst<CustomCategoryRow>(
      'SELECT * FROM custom_categories WHERE id = ?',
      [id]
    );
    if (!result) throw new Error('Custom category not found');
    return mapRowToCustomCategory(result);
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM custom_categories WHERE id = ?', [id]);
  },

  async deleteByType(type: CustomCategoryType): Promise<void> {
    await execute('DELETE FROM custom_categories WHERE type = ? AND is_default = 0', [type]);
  },

  async reorder(ids: UUID[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await execute(
        'UPDATE custom_categories SET sort_order = ?, updated_at = ? WHERE id = ?',
        [i, getCurrentISODate(), ids[i]]
      );
    }
  },

  async initializeDefaultCategories(): Promise<void> {
    // Check if we already have default categories
    const existing = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM custom_categories WHERE is_default = 1'
    );

    if (existing && existing.count > 0) {
      return; // Already initialized
    }

    const now = getCurrentISODate();

    // Default expense types
    const expenseTypes = [
      { name: 'repair', icon: 'Wrench', color: '#f97316' },
      { name: 'bill', icon: 'Receipt', color: '#8b5cf6' },
      { name: 'maintenance', icon: 'Settings', color: '#14b8a6' },
      { name: 'purchase', icon: 'ShoppingBag', color: '#3b82f6' },
      { name: 'other', icon: 'MoreHorizontal', color: '#94a3b8' },
    ];

    // Default expense categories (for specific expense items)
    const expenseCategories = [
      { name: 'Electricity', icon: 'Zap', color: '#eab308' },
      { name: 'Gas', icon: 'Flame', color: '#f97316' },
      { name: 'Water', icon: 'Droplets', color: '#0ea5e9' },
      { name: 'Internet', icon: 'Wifi', color: '#6366f1' },
      { name: 'Insurance', icon: 'Shield', color: '#8b5cf6' },
      { name: 'HOA', icon: 'Building2', color: '#78716c' },
      { name: 'Plumbing', icon: 'Wrench', color: '#0ea5e9' },
      { name: 'Electrical', icon: 'Zap', color: '#eab308' },
      { name: 'HVAC', icon: 'Thermometer', color: '#06b6d4' },
      { name: 'Appliance', icon: 'Refrigerator', color: '#3b82f6' },
      { name: 'Furniture', icon: 'Armchair', color: '#a855f7' },
      { name: 'Cleaning', icon: 'Sparkles', color: '#22c55e' },
      { name: 'Landscaping', icon: 'Trees', color: '#22c55e' },
      { name: 'Pest Control', icon: 'Bug', color: '#ef4444' },
      { name: 'Security', icon: 'Lock', color: '#64748b' },
      { name: 'Other', icon: 'MoreHorizontal', color: '#94a3b8' },
    ];

    // Default bill categories (for recurring payments)
    const billCategories = [
      { name: 'Electricity', icon: 'Zap', color: '#eab308' },
      { name: 'Gas', icon: 'Flame', color: '#f97316' },
      { name: 'Water', icon: 'Droplets', color: '#0ea5e9' },
      { name: 'Internet', icon: 'Wifi', color: '#6366f1' },
      { name: 'Phone', icon: 'Phone', color: '#22c55e' },
      { name: 'Insurance', icon: 'Shield', color: '#8b5cf6' },
      { name: 'HOA', icon: 'Building2', color: '#78716c' },
      { name: 'Property Tax', icon: 'FileText', color: '#ef4444' },
      { name: 'Mortgage', icon: 'Home', color: '#3b82f6' },
      { name: 'Rent', icon: 'Key', color: '#ec4899' },
      { name: 'Trash', icon: 'Trash2', color: '#64748b' },
      { name: 'Lawn Care', icon: 'Trees', color: '#22c55e' },
      { name: 'Pool Service', icon: 'Waves', color: '#0ea5e9' },
      { name: 'Security', icon: 'Lock', color: '#64748b' },
      { name: 'Other', icon: 'MoreHorizontal', color: '#94a3b8' },
    ];

    // Insert expense types
    for (let i = 0; i < expenseTypes.length; i++) {
      const item = expenseTypes[i];
      await execute(
        `INSERT INTO custom_categories (id, type, name, icon, color, is_default, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [generateUUID(), 'expense_type', item.name, item.icon, item.color, i, now, now]
      );
    }

    // Insert expense categories
    for (let i = 0; i < expenseCategories.length; i++) {
      const item = expenseCategories[i];
      await execute(
        `INSERT INTO custom_categories (id, type, name, icon, color, is_default, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [generateUUID(), 'expense_category', item.name, item.icon, item.color, i, now, now]
      );
    }

    // Insert bill categories
    for (let i = 0; i < billCategories.length; i++) {
      const item = billCategories[i];
      await execute(
        `INSERT INTO custom_categories (id, type, name, icon, color, is_default, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [generateUUID(), 'bill_category', item.name, item.icon, item.color, i, now, now]
      );
    }
  },
};
