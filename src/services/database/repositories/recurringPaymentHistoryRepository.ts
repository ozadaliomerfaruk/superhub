import { RecurringPaymentHistory, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface PaymentHistoryRow {
  id: string;
  template_id: string;
  amount: number;
  paid_date: string;
  notes: string | null;
  created_at: string;
}

function mapRowToPaymentHistory(row: PaymentHistoryRow): RecurringPaymentHistory {
  return {
    id: row.id,
    templateId: row.template_id,
    amount: row.amount,
    paidDate: row.paid_date,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export const recurringPaymentHistoryRepository = {
  async getByTemplateId(templateId: UUID): Promise<RecurringPaymentHistory[]> {
    const rows = await queryAll<PaymentHistoryRow>(
      'SELECT * FROM recurring_payment_history WHERE template_id = ? ORDER BY paid_date DESC',
      [templateId]
    );
    return rows.map(mapRowToPaymentHistory);
  },

  async getById(id: UUID): Promise<RecurringPaymentHistory | null> {
    const row = await queryFirst<PaymentHistoryRow>(
      'SELECT * FROM recurring_payment_history WHERE id = ?',
      [id]
    );
    return row ? mapRowToPaymentHistory(row) : null;
  },

  async getLatestByTemplateId(templateId: UUID): Promise<RecurringPaymentHistory | null> {
    const row = await queryFirst<PaymentHistoryRow>(
      'SELECT * FROM recurring_payment_history WHERE template_id = ? ORDER BY paid_date DESC LIMIT 1',
      [templateId]
    );
    return row ? mapRowToPaymentHistory(row) : null;
  },

  async getCountByTemplateId(templateId: UUID): Promise<number> {
    const result = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM recurring_payment_history WHERE template_id = ?',
      [templateId]
    );
    return result?.count || 0;
  },

  async getTotalByTemplateId(templateId: UUID): Promise<number> {
    const result = await queryFirst<{ total: number }>(
      'SELECT SUM(amount) as total FROM recurring_payment_history WHERE template_id = ?',
      [templateId]
    );
    return result?.total || 0;
  },

  async create(data: Omit<RecurringPaymentHistory, 'id' | 'createdAt'>): Promise<RecurringPaymentHistory> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO recurring_payment_history (id, template_id, amount, paid_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.templateId,
        data.amount,
        data.paidDate,
        data.notes || null,
        now,
      ]
    );

    return {
      id,
      templateId: data.templateId,
      amount: data.amount,
      paidDate: data.paidDate,
      notes: data.notes,
      createdAt: now,
    };
  },

  async update(id: UUID, data: Partial<Omit<RecurringPaymentHistory, 'id' | 'templateId' | 'createdAt'>>): Promise<RecurringPaymentHistory> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.amount !== undefined) {
      fields.push('amount = ?');
      values.push(data.amount);
    }
    if (data.paidDate !== undefined) {
      fields.push('paid_date = ?');
      values.push(data.paidDate);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes || null);
    }

    values.push(id);

    await execute(
      `UPDATE recurring_payment_history SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const payment = await this.getById(id);
    if (!payment) throw new Error('Payment history not found');
    return payment;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM recurring_payment_history WHERE id = ?', [id]);
  },

  async deleteByTemplateId(templateId: UUID): Promise<void> {
    await execute('DELETE FROM recurring_payment_history WHERE template_id = ?', [templateId]);
  },
};
