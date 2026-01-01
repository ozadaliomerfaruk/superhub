import { MaintenanceTask, MaintenanceTaskWithWorker, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface MaintenanceRow {
  id: string;
  property_id: string;
  asset_id: string | null;
  assigned_worker_id: string | null;
  title: string;
  description: string | null;
  frequency: string;
  last_completed_date: string | null;
  next_due_date: string;
  reminder_days_before: number;
  is_completed: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface MaintenanceWithWorkerRow extends MaintenanceRow {
  assigned_worker_name: string | null;
  last_completion_worker_name: string | null;
}

function mapRowToMaintenance(row: MaintenanceRow): MaintenanceTask {
  return {
    id: row.id,
    propertyId: row.property_id,
    assetId: row.asset_id || undefined,
    assignedWorkerId: row.assigned_worker_id || undefined,
    title: row.title,
    description: row.description || undefined,
    frequency: row.frequency as MaintenanceTask['frequency'],
    lastCompletedDate: row.last_completed_date || undefined,
    nextDueDate: row.next_due_date,
    reminderDaysBefore: row.reminder_days_before,
    isCompleted: row.is_completed === 1,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToMaintenanceWithWorker(row: MaintenanceWithWorkerRow): MaintenanceTaskWithWorker {
  return {
    ...mapRowToMaintenance(row),
    assignedWorkerName: row.assigned_worker_name || undefined,
    lastCompletionWorkerName: row.last_completion_worker_name || undefined,
  };
}

export const maintenanceRepository = {
  async getByPropertyId(propertyId: UUID): Promise<MaintenanceTaskWithWorker[]> {
    const rows = await queryAll<MaintenanceWithWorkerRow>(
      `SELECT mt.*,
              w.name as assigned_worker_name,
              (SELECT w2.name FROM maintenance_completions mc
               LEFT JOIN workers w2 ON mc.worker_id = w2.id
               WHERE mc.task_id = mt.id
               ORDER BY mc.completed_date DESC LIMIT 1) as last_completion_worker_name
       FROM maintenance_tasks mt
       LEFT JOIN workers w ON mt.assigned_worker_id = w.id
       WHERE mt.property_id = ? AND mt.is_active = 1
       ORDER BY mt.is_completed ASC, mt.next_due_date ASC`,
      [propertyId]
    );
    return rows.map(mapRowToMaintenanceWithWorker);
  },

  async getById(id: UUID): Promise<MaintenanceTask | null> {
    const row = await queryFirst<MaintenanceRow>(
      'SELECT * FROM maintenance_tasks WHERE id = ?',
      [id]
    );
    return row ? mapRowToMaintenance(row) : null;
  },

  async getByIdWithWorker(id: UUID): Promise<MaintenanceTaskWithWorker | null> {
    const row = await queryFirst<MaintenanceWithWorkerRow>(
      `SELECT mt.*,
              w.name as assigned_worker_name,
              (SELECT w2.name FROM maintenance_completions mc
               LEFT JOIN workers w2 ON mc.worker_id = w2.id
               WHERE mc.task_id = mt.id
               ORDER BY mc.completed_date DESC LIMIT 1) as last_completion_worker_name
       FROM maintenance_tasks mt
       LEFT JOIN workers w ON mt.assigned_worker_id = w.id
       WHERE mt.id = ?`,
      [id]
    );
    return row ? mapRowToMaintenanceWithWorker(row) : null;
  },

  async getUpcoming(propertyId: UUID, days: number = 30): Promise<MaintenanceTask[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const rows = await queryAll<MaintenanceRow>(
      `SELECT * FROM maintenance_tasks
       WHERE property_id = ? AND next_due_date <= ? AND is_completed = 0 AND is_active = 1
       ORDER BY next_due_date ASC`,
      [propertyId, futureDate.toISOString()]
    );
    return rows.map(mapRowToMaintenance);
  },

  async getOverdue(propertyId: UUID): Promise<MaintenanceTask[]> {
    const now = new Date().toISOString();
    const rows = await queryAll<MaintenanceRow>(
      `SELECT * FROM maintenance_tasks
       WHERE property_id = ? AND next_due_date < ? AND is_completed = 0 AND is_active = 1
       ORDER BY next_due_date ASC`,
      [propertyId, now]
    );
    return rows.map(mapRowToMaintenance);
  },

  async create(data: Omit<MaintenanceTask, 'id' | 'createdAt' | 'updatedAt' | 'isCompleted' | 'isActive'>): Promise<MaintenanceTask> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO maintenance_tasks (id, property_id, asset_id, assigned_worker_id, title, description, frequency, last_completed_date, next_due_date, reminder_days_before, is_completed, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId,
        data.assetId || null,
        data.assignedWorkerId || null,
        data.title,
        data.description || null,
        data.frequency,
        data.lastCompletedDate || null,
        data.nextDueDate,
        data.reminderDaysBefore,
        0,
        1, // is_active = true by default
        now,
        now,
      ]
    );

    const task = await this.getById(id);
    if (!task) throw new Error('Failed to create maintenance task');
    return task;
  },

  async update(id: UUID, data: Partial<Omit<MaintenanceTask, 'id' | 'propertyId' | 'createdAt' | 'updatedAt'>>): Promise<MaintenanceTask> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.assetId !== undefined) {
      fields.push('asset_id = ?');
      values.push(data.assetId || null);
    }
    if (data.assignedWorkerId !== undefined) {
      fields.push('assigned_worker_id = ?');
      values.push(data.assignedWorkerId || null);
    }
    if (data.title !== undefined) {
      fields.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description || null);
    }
    if (data.frequency !== undefined) {
      fields.push('frequency = ?');
      values.push(data.frequency);
    }
    if (data.lastCompletedDate !== undefined) {
      fields.push('last_completed_date = ?');
      values.push(data.lastCompletedDate || null);
    }
    if (data.nextDueDate !== undefined) {
      fields.push('next_due_date = ?');
      values.push(data.nextDueDate);
    }
    if (data.reminderDaysBefore !== undefined) {
      fields.push('reminder_days_before = ?');
      values.push(data.reminderDaysBefore);
    }
    if (data.isCompleted !== undefined) {
      fields.push('is_completed = ?');
      values.push(data.isCompleted ? 1 : 0);
    }
    if (data.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE maintenance_tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const task = await this.getById(id);
    if (!task) throw new Error('Maintenance task not found');
    return task;
  },

  async markComplete(id: UUID): Promise<MaintenanceTask> {
    const task = await this.getById(id);
    if (!task) throw new Error('Maintenance task not found');

    const now = new Date();

    // For one-time tasks, just mark as completed without rescheduling
    if (task.frequency === 'once') {
      return this.update(id, {
        lastCompletedDate: now.toISOString(),
        isCompleted: true,
      });
    }

    // For recurring tasks, calculate next due date based on frequency
    let nextDueDate = new Date();

    switch (task.frequency) {
      case 'weekly':
        nextDueDate.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        nextDueDate.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        nextDueDate.setMonth(now.getMonth() + 3);
        break;
      case 'biannual':
        nextDueDate.setMonth(now.getMonth() + 6);
        break;
      case 'yearly':
        nextDueDate.setFullYear(now.getFullYear() + 1);
        break;
    }

    return this.update(id, {
      lastCompletedDate: now.toISOString(),
      nextDueDate: nextDueDate.toISOString(),
      isCompleted: false, // Reset for next occurrence
    });
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM maintenance_tasks WHERE id = ?', [id]);
  },

  async getByAssignedWorkerId(workerId: UUID): Promise<MaintenanceTaskWithWorker[]> {
    const rows = await queryAll<MaintenanceWithWorkerRow>(
      `SELECT mt.*,
              w.name as assigned_worker_name,
              (SELECT w2.name FROM maintenance_completions mc
               LEFT JOIN workers w2 ON mc.worker_id = w2.id
               WHERE mc.task_id = mt.id
               ORDER BY mc.completed_date DESC LIMIT 1) as last_completion_worker_name
       FROM maintenance_tasks mt
       LEFT JOIN workers w ON mt.assigned_worker_id = w.id
       WHERE mt.assigned_worker_id = ? AND mt.is_active = 1
       ORDER BY mt.is_completed ASC, mt.next_due_date ASC`,
      [workerId]
    );
    return rows.map(mapRowToMaintenanceWithWorker);
  },
};
