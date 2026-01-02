import { RenovationWorker, RenovationWorkerWithDetails, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface RenovationWorkerRow {
  id: string;
  renovation_id: string;
  worker_id: string;
  role: string | null;
  created_at: string;
}

interface RenovationWorkerWithDetailsRow extends RenovationWorkerRow {
  worker_name: string;
  worker_phone: string | null;
  worker_specialty: string;
}

function mapRowToRenovationWorker(row: RenovationWorkerRow): RenovationWorker {
  return {
    id: row.id,
    renovationId: row.renovation_id,
    workerId: row.worker_id,
    role: row.role || undefined,
    createdAt: row.created_at,
  };
}

function mapRowToRenovationWorkerWithDetails(row: RenovationWorkerWithDetailsRow): RenovationWorkerWithDetails {
  return {
    ...mapRowToRenovationWorker(row),
    workerName: row.worker_name,
    workerPhone: row.worker_phone || undefined,
    workerSpecialty: JSON.parse(row.worker_specialty || '[]'),
  };
}

export const renovationWorkerRepository = {
  async getByRenovationId(renovationId: UUID): Promise<RenovationWorkerWithDetails[]> {
    const rows = await queryAll<RenovationWorkerWithDetailsRow>(
      `SELECT rw.*, w.name as worker_name, w.phone as worker_phone, w.specialty as worker_specialty
       FROM renovation_workers rw
       JOIN workers w ON rw.worker_id = w.id
       WHERE rw.renovation_id = ?
       ORDER BY rw.created_at ASC`,
      [renovationId]
    );
    return rows.map(mapRowToRenovationWorkerWithDetails);
  },

  async create(data: Omit<RenovationWorker, 'id' | 'createdAt'>): Promise<RenovationWorker> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO renovation_workers (id, renovation_id, worker_id, role, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.renovationId, data.workerId, data.role || null, now]
    );

    const result = await queryFirst<RenovationWorkerRow>(
      'SELECT * FROM renovation_workers WHERE id = ?',
      [id]
    );
    if (!result) throw new Error('Failed to create renovation worker');
    return mapRowToRenovationWorker(result);
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM renovation_workers WHERE id = ?', [id]);
  },

  async deleteByRenovationId(renovationId: UUID): Promise<void> {
    await execute('DELETE FROM renovation_workers WHERE renovation_id = ?', [renovationId]);
  },
};
