import { getDatabase } from './database';
import {
  ProjectTemplate,
  TemplateMaterial,
  CreateProjectTemplateInput,
  TradeCategory,
} from '../types';

// Helper to cast SQLite integers to booleans
function castTemplate(row: any): ProjectTemplate {
  return {
    ...row,
    is_builtin: Boolean(row.is_builtin),
  };
}

// ─── Template CRUD ──────────────────────────────────────────

export async function getAllTemplates(): Promise<ProjectTemplate[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM project_templates ORDER BY trade_category, title'
  );
  return rows.map(castTemplate);
}

export async function getTemplatesByCategory(category: TradeCategory): Promise<ProjectTemplate[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM project_templates WHERE trade_category = ? ORDER BY title',
    [category]
  );
  return rows.map(castTemplate);
}

export async function getTemplateById(id: number): Promise<ProjectTemplate | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM project_templates WHERE id = ?',
    [id]
  );
  return row ? castTemplate(row) : null;
}

export async function createTemplate(input: CreateProjectTemplateInput): Promise<ProjectTemplate> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO project_templates (title, trade_category, estimated_duration_seconds, default_notes, is_builtin, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
    [
      input.title.trim(),
      input.trade_category,
      input.estimated_duration_seconds,
      input.default_notes?.trim() || null,
      now,
      now,
    ]
  );

  const templateId = result.lastInsertRowId;

  // Insert materials if provided
  if (input.materials && input.materials.length > 0) {
    for (const mat of input.materials) {
      await db.runAsync(
        'INSERT INTO template_materials (template_id, name, cost) VALUES (?, ?, ?)',
        [templateId, mat.name.trim(), mat.cost]
      );
    }
  }

  const template = await getTemplateById(templateId);
  if (!template) throw new Error('Failed to create template');
  return template;
}

export async function updateTemplate(
  id: number,
  input: Partial<CreateProjectTemplateInput>
): Promise<ProjectTemplate> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  const updates: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (input.title !== undefined) {
    updates.push('title = ?');
    values.push(input.title.trim());
  }
  if (input.trade_category !== undefined) {
    updates.push('trade_category = ?');
    values.push(input.trade_category);
  }
  if (input.estimated_duration_seconds !== undefined) {
    updates.push('estimated_duration_seconds = ?');
    values.push(input.estimated_duration_seconds);
  }
  if (input.default_notes !== undefined) {
    updates.push('default_notes = ?');
    values.push(input.default_notes?.trim() || null);
  }

  values.push(id);

  await db.runAsync(
    `UPDATE project_templates SET ${updates.join(', ')} WHERE id = ?`,
    values
  );

  const template = await getTemplateById(id);
  if (!template) throw new Error('Template not found');
  return template;
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM project_templates WHERE id = ? AND is_builtin = 0', [id]);
}

// ─── Template Materials CRUD ────────────────────────────────

export async function getTemplateMaterials(templateId: number): Promise<TemplateMaterial[]> {
  const db = await getDatabase();
  return db.getAllAsync<TemplateMaterial>(
    'SELECT * FROM template_materials WHERE template_id = ? ORDER BY name',
    [templateId]
  );
}

export async function addTemplateMaterial(
  templateId: number,
  name: string,
  cost: number
): Promise<TemplateMaterial> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO template_materials (template_id, name, cost) VALUES (?, ?, ?)',
    [templateId, name.trim(), cost]
  );
  const row = await db.getFirstAsync<TemplateMaterial>(
    'SELECT * FROM template_materials WHERE id = ?',
    [result.lastInsertRowId]
  );
  if (!row) throw new Error('Failed to add template material');
  return row;
}

export async function deleteTemplateMaterial(materialId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM template_materials WHERE id = ?', [materialId]);
}
