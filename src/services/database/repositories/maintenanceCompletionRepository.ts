import { MaintenanceCompletion, MaintenanceCompletionWithWorker, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface CompletionRow {
  id: string;
  task_id: string;
  worker_id: string | null;
  completed_date: string;
  notes: string | null;
  cost: number | null;
  created_at: string;
}

interface CompletionWithWorkerRow extends CompletionRow {
  worker_name: string | null;
  task_title: string | null;
}

function mapRowToCompletion(row: CompletionRow): MaintenanceCompletion {
  return {
    id: row.id,
    taskId: row.task_id,
    workerId: row.worker_id || undefined,
    completedDate: row.completed_date,
    notes: row.notes || undefined,
    cost: row.cost || undefined,
    createdAt: row.created_at,
  };
}

function mapRowToCompletionWithWorker(row: CompletionWithWorkerRow): MaintenanceCompletionWithWorker {
  return {
    ...mapRowToCompletion(row),
    workerName: row.worker_name || undefined,
    taskTitle: row.task_title || undefined,
  };
}

export const maintenanceCompletionRepository = {
  async getByTaskId(taskId: UUID): Promise<MaintenanceCompletionWithWorker[]> {
    const rows = await queryAll<CompletionWithWorkerRow>(
      `SELECT mc.*, w.name as worker_name, mt.title as task_title
       FROM maintenance_completions mc
       LEFT JOIN workers w ON mc.worker_id = w.id
       LEFT JOIN maintenance_tasks mt ON mc.task_id = mt.id
       WHERE mc.task_id = ?
       ORDER BY mc.completed_date DESC`,
      [taskId]
    );
    return rows.map(mapRowToCompletionWithWorker);
  },

  async getById(id: UUID): Promise<MaintenanceCompletionWithWorker | null> {
    const row = await queryFirst<CompletionWithWorkerRow>(
      `SELECT mc.*, w.name as worker_name, mt.title as task_title
       FROM maintenance_completions mc
       LEFT JOIN workers w ON mc.worker_id = w.id
       LEFT JOIN maintenance_tasks mt ON mc.task_id = mt.id
       WHERE mc.id = ?`,
      [id]
    );
    return row ? mapRowToCompletionWithWorker(row) : null;
  },

  async getLatestByTaskId(taskId: UUID): Promise<MaintenanceCompletionWithWorker | null> {
    const row = await queryFirst<CompletionWithWorkerRow>(
      `SELECT mc.*, w.name as worker_name, mt.title as task_title
       FROM maintenance_completions mc
       LEFT JOIN workers w ON mc.worker_id = w.id
       LEFT JOIN maintenance_tasks mt ON mc.task_id = mt.id
       WHERE mc.task_id = ?
       ORDER BY mc.completed_date DESC
       LIMIT 1`,
      [taskId]
    );
    return row ? mapRowToCompletionWithWorker(row) : null;
  },

  async getCountByTaskId(taskId: UUID): Promise<number> {
    const result = await queryFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM maintenance_completions WHERE task_id = ?',
      [taskId]
    );
    return result?.count || 0;
  },

  async create(data: Omit<MaintenanceCompletion, 'id' | 'createdAt'>): Promise<MaintenanceCompletion> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO maintenance_completions (id, task_id, worker_id, completed_date, notes, cost, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.taskId,
        data.workerId || null,
        data.completedDate,
        data.notes || null,
        data.cost || null,
        now,
      ]
    );

    return {
      id,
      taskId: data.taskId,
      workerId: data.workerId,
      completedDate: data.completedDate,
      notes: data.notes,
      cost: data.cost,
      createdAt: now,
    };
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM maintenance_completions WHERE id = ?', [id]);
  },

  async deleteByTaskId(taskId: UUID): Promise<void> {
    await execute('DELETE FROM maintenance_completions WHERE task_id = ?', [taskId]);
  },

  async getByWorkerId(workerId: UUID): Promise<MaintenanceCompletionWithWorker[]> {
    const rows = await queryAll<CompletionWithWorkerRow>(
      `SELECT mc.*, w.name as worker_name, mt.title as task_title
       FROM maintenance_completions mc
       LEFT JOIN workers w ON mc.worker_id = w.id
       LEFT JOIN maintenance_tasks mt ON mc.task_id = mt.id
       WHERE mc.worker_id = ?
       ORDER BY mc.completed_date DESC`,
      [workerId]
    );
    return rows.map(mapRowToCompletionWithWorker);
  },
};
