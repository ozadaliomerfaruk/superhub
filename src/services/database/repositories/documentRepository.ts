import { Document, UUID } from '../../../types';
import { queryAll, queryFirst, execute } from '../database';
import { generateUUID } from '../../../utils/uuid';
import { getCurrentISODate } from '../../../utils/date';

interface DocumentRow {
  id: string;
  property_id: string | null;
  asset_id: string | null;
  worker_id: string | null;
  name: string;
  type: string;
  file_uri: string;
  file_type: string;
  created_at: string;
  updated_at: string;
}

function mapRowToDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    propertyId: row.property_id || undefined,
    assetId: row.asset_id || undefined,
    workerId: row.worker_id || undefined,
    name: row.name,
    type: row.type as Document['type'],
    fileUri: row.file_uri,
    fileType: row.file_type as Document['fileType'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const documentRepository = {
  async getAll(): Promise<Document[]> {
    const rows = await queryAll<DocumentRow>(
      'SELECT * FROM documents ORDER BY created_at DESC'
    );
    return rows.map(mapRowToDocument);
  },

  async getByPropertyId(propertyId: UUID): Promise<Document[]> {
    const rows = await queryAll<DocumentRow>(
      'SELECT * FROM documents WHERE property_id = ? ORDER BY created_at DESC',
      [propertyId]
    );
    return rows.map(mapRowToDocument);
  },

  async getByAssetId(assetId: UUID): Promise<Document[]> {
    const rows = await queryAll<DocumentRow>(
      'SELECT * FROM documents WHERE asset_id = ? ORDER BY created_at DESC',
      [assetId]
    );
    return rows.map(mapRowToDocument);
  },

  async getByWorkerId(workerId: UUID): Promise<Document[]> {
    const rows = await queryAll<DocumentRow>(
      'SELECT * FROM documents WHERE worker_id = ? ORDER BY created_at DESC',
      [workerId]
    );
    return rows.map(mapRowToDocument);
  },

  async getById(id: UUID): Promise<Document | null> {
    const row = await queryFirst<DocumentRow>(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );
    return row ? mapRowToDocument(row) : null;
  },

  async search(query: string, propertyId?: UUID): Promise<Document[]> {
    const searchQuery = `%${query}%`;
    let sql = 'SELECT * FROM documents WHERE name LIKE ?';
    const params: any[] = [searchQuery];

    if (propertyId) {
      sql += ' AND property_id = ?';
      params.push(propertyId);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = await queryAll<DocumentRow>(sql, params);
    return rows.map(mapRowToDocument);
  },

  async create(data: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Promise<Document> {
    const id = generateUUID();
    const now = getCurrentISODate();

    await execute(
      `INSERT INTO documents (id, property_id, asset_id, worker_id, name, type, file_uri, file_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.propertyId || null,
        data.assetId || null,
        data.workerId || null,
        data.name,
        data.type,
        data.fileUri,
        data.fileType,
        now,
        now,
      ]
    );

    const doc = await this.getById(id);
    if (!doc) throw new Error('Failed to create document');
    return doc;
  },

  async update(id: UUID, data: Partial<Omit<Document, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Document> {
    const now = getCurrentISODate();
    const fields: string[] = [];
    const values: any[] = [];

    if (data.propertyId !== undefined) {
      fields.push('property_id = ?');
      values.push(data.propertyId || null);
    }
    if (data.assetId !== undefined) {
      fields.push('asset_id = ?');
      values.push(data.assetId || null);
    }
    if (data.workerId !== undefined) {
      fields.push('worker_id = ?');
      values.push(data.workerId || null);
    }
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.fileUri !== undefined) {
      fields.push('file_uri = ?');
      values.push(data.fileUri);
    }
    if (data.fileType !== undefined) {
      fields.push('file_type = ?');
      values.push(data.fileType);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await execute(
      `UPDATE documents SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    const doc = await this.getById(id);
    if (!doc) throw new Error('Document not found');
    return doc;
  },

  async delete(id: UUID): Promise<void> {
    await execute('DELETE FROM documents WHERE id = ?', [id]);
  },

  async getByType(type: Document['type'], propertyId?: UUID): Promise<Document[]> {
    let sql = 'SELECT * FROM documents WHERE type = ?';
    const params: any[] = [type];

    if (propertyId) {
      sql += ' AND property_id = ?';
      params.push(propertyId);
    }

    sql += ' ORDER BY created_at DESC';
    const rows = await queryAll<DocumentRow>(sql, params);
    return rows.map(mapRowToDocument);
  },
};
