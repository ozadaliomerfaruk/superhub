import { Worker, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface WorkerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  specialty: string;
  rating: number | null;
  notes: string | null;
  image_uri: string | null;
  total_paid: number;
  created_at: string;
  updated_at: string;
}

function mapRowToWorker(row: WorkerRow): Worker {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    email: row.email || undefined,
    company: row.company || undefined,
    specialty: JSON.parse(row.specialty || '[]'),
    rating: row.rating || undefined,
    notes: row.notes || undefined,
    imageUri: row.image_uri || undefined,
    totalPaid: row.total_paid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const workerRepository = {
  async getAll(): Promise<Worker[]> {
    const rows = await queryAll<WorkerRow>(
      'SELECT * FROM workers ORDER BY name ASC'
    );
    return rows.map(mapRowToWorker);
  },

  async getById(id: UUID): Promise<Worker | null> {
    const row = await queryFirst<WorkerRow>(
      'SELECT * FROM workers WHERE id = ?',
      [id]
    );
    return row ? mapRowToWorker(row) : null;
  },

  async getBySpecialty(specialty: string): Promise<Worker[]> {
    // Escape special characters for LIKE pattern and JSON string
    const escapedSpecialty = specialty.replace(/[%_"\\]/g, '\\$&');
    const rows = await queryAll<WorkerRow>(
      `SELECT * FROM workers WHERE specialty LIKE ? ESCAPE '\\' ORDER BY name ASC`,
      [`%"${escapedSpecialty}"%`]
    );
    return rows.map(mapRowToWorker);
  },

  async create(data: Omit<Worker, 'id' | 'createdAt' | 'updatedAt' | 'totalPaid'>): Promise<Worker> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO workers (id, name, phone, email, company, specialty, rating, notes, image_uri, total_paid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.phone || null,
        data.email || null,
        data.company || null,
        JSON.stringify(data.specialty || []),
        data.rating || null,
        data.notes || null,
        data.imageUri || null,
        0,
        now,
        now,
      ]
    );

    const worker = await this.getById(id);
    if (!worker) throw new Error('Failed to create worker');
    return worker;
  },

  async update(id: UUID, data: Partial<Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Worker> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      fields.push('phone = ?');
      values.push(data.phone || null);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email || null);
    }
    if (data.company !== undefined) {
      fields.push('company = ?');
      values.push(data.company || null);
    }
    if (data.specialty !== undefined) {
      fields.push('specialty = ?');
      values.push(JSON.stringify(data.specialty));
    }
    if (data.rating !== undefined) {
      fields.push('rating = ?');
      values.push(data.rating || null);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes || null);
    }
    if (data.imageUri !== undefined) {
      fields.push('image_uri = ?');
      values.push(data.imageUri || null);
    }
    if (data.totalPaid !== undefined) {
      fields.push('total_paid = ?');
      values.push(data.totalPaid);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE workers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const worker = await this.getById(id);
    if (!worker) throw new Error('Worker not found');
    return worker;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM workers WHERE id = ?', [id]);
  },

  async updateTotalPaid(id: UUID, amount: number): Promise<void> {
    await execute(
      'UPDATE workers SET total_paid = total_paid + ?, updated_at = ? WHERE id = ?',
      [amount, getCurrentISODate(), id]
    );
  },

  async search(query: string): Promise<Worker[]> {
    const searchQuery = `%${query}%`;
    const rows = await queryAll<WorkerRow>(
      `SELECT * FROM workers
       WHERE name LIKE ? OR company LIKE ? OR specialty LIKE ?
       ORDER BY name ASC`,
      [searchQuery, searchQuery, searchQuery]
    );
    return rows.map(mapRowToWorker);
  },
};
