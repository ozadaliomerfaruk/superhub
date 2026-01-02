import { WorkerNote, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface WorkerNoteRow {
  id: string;
  worker_id: string;
  content: string;
  date: string;
  created_at: string;
  updated_at: string;
}

function mapRowToWorkerNote(row: WorkerNoteRow): WorkerNote {
  return {
    id: row.id,
    workerId: row.worker_id,
    content: row.content,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const workerNoteRepository = {
  async getByWorkerId(workerId: UUID): Promise<WorkerNote[]> {
    const rows = await queryAll<WorkerNoteRow>(
      `SELECT * FROM worker_notes WHERE worker_id = ? ORDER BY date DESC, created_at DESC`,
      [workerId]
    );
    return rows.map(mapRowToWorkerNote);
  },

  async getById(id: UUID): Promise<WorkerNote | null> {
    const row = await queryFirst<WorkerNoteRow>(
      'SELECT * FROM worker_notes WHERE id = ?',
      [id]
    );
    return row ? mapRowToWorkerNote(row) : null;
  },

  async create(data: Omit<WorkerNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkerNote> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO worker_notes (id, worker_id, content, date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.workerId, data.content, data.date, now, now]
    );

    const result = await queryFirst<WorkerNoteRow>(
      'SELECT * FROM worker_notes WHERE id = ?',
      [id]
    );
    if (!result) throw new Error('Failed to create worker note');
    return mapRowToWorkerNote(result);
  },

  async update(id: UUID, data: Partial<Omit<WorkerNote, 'id' | 'workerId' | 'createdAt' | 'updatedAt'>>): Promise<WorkerNote> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.content !== undefined) {
      fields.push('content = ?');
      values.push(data.content);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE worker_notes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const result = await queryFirst<WorkerNoteRow>(
      'SELECT * FROM worker_notes WHERE id = ?',
      [id]
    );
    if (!result) throw new Error('Worker note not found');
    return mapRowToWorkerNote(result);
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM worker_notes WHERE id = ?', [id]);
  },

  async deleteByWorkerId(workerId: UUID): Promise<void> {
    await execute('DELETE FROM worker_notes WHERE worker_id = ?', [workerId]);
  },

  async getCountByWorkerId(workerId: UUID): Promise<number> {
    const result = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM worker_notes WHERE worker_id = ?',
      [workerId]
    );
    return result?.count || 0;
  },
};
