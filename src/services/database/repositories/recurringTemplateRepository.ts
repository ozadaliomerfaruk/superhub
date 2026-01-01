import { RecurringTemplate, RecurringTemplateWithHistory, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface RecurringTemplateRow {
  id: string;
  property_id: string;
  name: string;
  category: string;
  estimated_amount: number | null;
  frequency: string;
  typical_payment_day: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface RecurringTemplateWithHistoryRow extends RecurringTemplateRow {
  payment_count: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
}

function mapRowToTemplate(row: RecurringTemplateRow): RecurringTemplate {
  return {
    id: row.id,
    propertyId: row.property_id,
    name: row.name,
    category: row.category,
    estimatedAmount: row.estimated_amount || undefined,
    frequency: row.frequency as RecurringTemplate['frequency'],
    typicalPaymentDay: row.typical_payment_day || undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToTemplateWithHistory(row: RecurringTemplateWithHistoryRow): RecurringTemplateWithHistory {
  return {
    ...mapRowToTemplate(row),
    paymentCount: row.payment_count || 0,
    lastPaymentDate: row.last_payment_date || undefined,
    lastPaymentAmount: row.last_payment_amount || undefined,
  };
}

export const recurringTemplateRepository = {
  async getByPropertyId(propertyId: UUID): Promise<RecurringTemplate[]> {
    const rows = await queryAll<RecurringTemplateRow>(
      'SELECT * FROM recurring_templates WHERE property_id = ? ORDER BY name ASC',
      [propertyId]
    );
    return rows.map(mapRowToTemplate);
  },

  async getByPropertyIdWithHistory(propertyId: UUID): Promise<RecurringTemplateWithHistory[]> {
    const rows = await queryAll<RecurringTemplateWithHistoryRow>(
      `SELECT rt.*,
              (SELECT COUNT(*) FROM recurring_payment_history rph WHERE rph.template_id = rt.id) as payment_count,
              (SELECT rph.paid_date FROM recurring_payment_history rph WHERE rph.template_id = rt.id ORDER BY rph.paid_date DESC LIMIT 1) as last_payment_date,
              (SELECT rph.amount FROM recurring_payment_history rph WHERE rph.template_id = rt.id ORDER BY rph.paid_date DESC LIMIT 1) as last_payment_amount
       FROM recurring_templates rt
       WHERE rt.property_id = ?
       ORDER BY rt.is_active DESC, rt.name ASC`,
      [propertyId]
    );
    return rows.map(mapRowToTemplateWithHistory);
  },

  async getActiveByPropertyId(propertyId: UUID): Promise<RecurringTemplate[]> {
    const rows = await queryAll<RecurringTemplateRow>(
      'SELECT * FROM recurring_templates WHERE property_id = ? AND is_active = 1 ORDER BY name ASC',
      [propertyId]
    );
    return rows.map(mapRowToTemplate);
  },

  async getById(id: UUID): Promise<RecurringTemplate | null> {
    const row = await queryFirst<RecurringTemplateRow>(
      'SELECT * FROM recurring_templates WHERE id = ?',
      [id]
    );
    return row ? mapRowToTemplate(row) : null;
  },

  async getByIdWithHistory(id: UUID): Promise<RecurringTemplateWithHistory | null> {
    const row = await queryFirst<RecurringTemplateWithHistoryRow>(
      `SELECT rt.*,
              (SELECT COUNT(*) FROM recurring_payment_history rph WHERE rph.template_id = rt.id) as payment_count,
              (SELECT rph.paid_date FROM recurring_payment_history rph WHERE rph.template_id = rt.id ORDER BY rph.paid_date DESC LIMIT 1) as last_payment_date,
              (SELECT rph.amount FROM recurring_payment_history rph WHERE rph.template_id = rt.id ORDER BY rph.paid_date DESC LIMIT 1) as last_payment_amount
       FROM recurring_templates rt
       WHERE rt.id = ?`,
      [id]
    );
    return row ? mapRowToTemplateWithHistory(row) : null;
  },

  async create(data: Omit<RecurringTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecurringTemplate> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO recurring_templates (id, property_id, name, category, estimated_amount, frequency, typical_payment_day, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.name,
        data.category,
        data.estimatedAmount ?? 0,
        data.frequency,
        data.typicalPaymentDay || null,
        data.isActive ? 1 : 0,
        now,
        now,
      ]
    );

    const template = await this.getById(id);
    if (!template) throw new Error('Failed to create recurring template');
    return template;
  },

  async update(id: UUID, data: Partial<Omit<RecurringTemplate, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<RecurringTemplate> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.category !== undefined) {
      fields.push('category = ?');
      values.push(data.category);
    }
    if (data.estimatedAmount !== undefined) {
      fields.push('estimated_amount = ?');
      values.push(data.estimatedAmount ?? 0);
    }
    if (data.frequency !== undefined) {
      fields.push('frequency = ?');
      values.push(data.frequency);
    }
    if (data.typicalPaymentDay !== undefined) {
      fields.push('typical_payment_day = ?');
      values.push(data.typicalPaymentDay || null);
    }
    if (data.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE recurring_templates SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const template = await this.getById(id);
    if (!template) throw new Error('Recurring template not found');
    return template;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM recurring_templates WHERE id = ?', [id]);
  },

  async toggleActive(id: UUID): Promise<RecurringTemplate> {
    const template = await this.getById(id);
    if (!template) throw new Error('Recurring template not found');

    return this.update(id, { isActive: !template.isActive });
  },

  async getMonthlyTotal(propertyId: UUID): Promise<number> {
    const templates = await this.getActiveByPropertyId(propertyId);
    let monthlyTotal = 0;

    for (const template of templates) {
      const amount = template.estimatedAmount || 0;
      switch (template.frequency) {
        case 'weekly':
          monthlyTotal += amount * 4.33;
          break;
        case 'biweekly':
          monthlyTotal += amount * 2.17;
          break;
        case 'monthly':
          monthlyTotal += amount;
          break;
        case 'quarterly':
          monthlyTotal += amount / 3;
          break;
        case 'yearly':
          monthlyTotal += amount / 12;
          break;
      }
    }

    return monthlyTotal;
  },
};
