import { Note, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface NoteRow {
  id: string;
  property_id: string | null;
  room_id: string | null;
  asset_id: string | null;
  worker_id: string | null;
  content: string;
  is_pinned: number;
  created_at: string;
  updated_at: string;
}

function mapRowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    propertyId: row.property_id || undefined,
    roomId: row.room_id || undefined,
    assetId: row.asset_id || undefined,
    workerId: row.worker_id || undefined,
    content: row.content,
    isPinned: row.is_pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const notesRepository = {
  async getAll(): Promise<Note[]> {
    const rows = await queryAll<NoteRow>(
      'SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC'
    );
    return rows.map(mapRowToNote);
  },

  async getByPropertyId(propertyId: UUID): Promise<Note[]> {
    const rows = await queryAll<NoteRow>(
      'SELECT * FROM notes WHERE property_id = ? ORDER BY is_pinned DESC, updated_at DESC',
      [propertyId]
    );
    return rows.map(mapRowToNote);
  },

  async getByRoomId(roomId: UUID): Promise<Note[]> {
    const rows = await queryAll<NoteRow>(
      'SELECT * FROM notes WHERE room_id = ? ORDER BY is_pinned DESC, updated_at DESC',
      [roomId]
    );
    return rows.map(mapRowToNote);
  },

  async getByAssetId(assetId: UUID): Promise<Note[]> {
    const rows = await queryAll<NoteRow>(
      'SELECT * FROM notes WHERE asset_id = ? ORDER BY is_pinned DESC, updated_at DESC',
      [assetId]
    );
    return rows.map(mapRowToNote);
  },

  async getByWorkerId(workerId: UUID): Promise<Note[]> {
    const rows = await queryAll<NoteRow>(
      'SELECT * FROM notes WHERE worker_id = ? ORDER BY is_pinned DESC, updated_at DESC',
      [workerId]
    );
    return rows.map(mapRowToNote);
  },

  async getById(id: UUID): Promise<Note | null> {
    const row = await queryFirst<NoteRow>(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );
    return row ? mapRowToNote(row) : null;
  },

  async getPinned(propertyId?: UUID): Promise<Note[]> {
    let sql = 'SELECT * FROM notes WHERE is_pinned = 1';
    const params: any[] = [];

    if (propertyId) {
      sql += ' AND property_id = ?';
      params.push(propertyId);
    }

    sql += ' ORDER BY updated_at DESC';
    const rows = await queryAll<NoteRow>(sql, params);
    return rows.map(mapRowToNote);
  },

  async search(query: string, propertyId?: UUID): Promise<Note[]> {
    const searchQuery = `%${query}%`;
    let sql = 'SELECT * FROM notes WHERE content LIKE ?';
    const params: any[] = [searchQuery];

    if (propertyId) {
      sql += ' AND property_id = ?';
      params.push(propertyId);
    }

    sql += ' ORDER BY is_pinned DESC, updated_at DESC';
    const rows = await queryAll<NoteRow>(sql, params);
    return rows.map(mapRowToNote);
  },

  async create(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO notes (id, property_id, room_id, asset_id, worker_id, content, is_pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId || null,
        data.roomId || null,
        data.assetId || null,
        data.workerId || null,
        data.content,
        data.isPinned ? 1 : 0,
        now,
        now,
      ]
    );

    const note = await this.getById(id);
    if (!note) throw new Error('Failed to create note');
    return note;
  },

  async update(id: UUID, data: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Note> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.propertyId !== undefined) {
      fields.push('property_id = ?');
      values.push(data.propertyId || null);
    }
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
    if (data.content !== undefined) {
      fields.push('content = ?');
      values.push(data.content);
    }
    if (data.isPinned !== undefined) {
      fields.push('is_pinned = ?');
      values.push(data.isPinned ? 1 : 0);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const note = await this.getById(id);
    if (!note) throw new Error('Note not found');
    return note;
  },

  async togglePin(id: UUID): Promise<Note> {
    const note = await this.getById(id);
    if (!note) throw new Error('Note not found');

    return this.update(id, { isPinned: !note.isPinned });
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM notes WHERE id = ?', [id]);
  },

  async deleteByPropertyId(propertyId: UUID): Promise<void> {
    await execute('DELETE FROM notes WHERE property_id = ?', [propertyId]);
  },

  async getRecentNotes(limit: number = 10, propertyId?: UUID): Promise<Note[]> {
    let sql = 'SELECT * FROM notes';
    const params: any[] = [];

    if (propertyId) {
      sql += ' WHERE property_id = ?';
      params.push(propertyId);
    }

    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    const rows = await queryAll<NoteRow>(sql, params);
    return rows.map(mapRowToNote);
  },
};
