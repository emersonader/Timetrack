import { useState, useEffect, useCallback } from 'react';
import {
  ProjectTemplate,
  TemplateMaterial,
  CreateProjectTemplateInput,
  TradeCategory,
} from '../types';
import {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplateMaterials,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../db/projectTemplateRepository';

interface UseProjectTemplatesResult {
  templates: ProjectTemplate[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useProjectTemplates(category?: TradeCategory): UseProjectTemplatesResult {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = category
        ? await getTemplatesByCategory(category)
        : await getAllTemplates();
      setTemplates(result);
    } catch (err) {
      console.error('Error loading project templates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  return { templates, isLoading, refresh: load };
}

interface UseProjectTemplateMutationsResult {
  createTemplate: (input: CreateProjectTemplateInput) => Promise<ProjectTemplate>;
  updateTemplate: (id: number, input: Partial<CreateProjectTemplateInput>) => Promise<ProjectTemplate>;
  deleteTemplate: (id: number) => Promise<void>;
  isLoading: boolean;
}

export function useProjectTemplateMutations(): UseProjectTemplateMutationsResult {
  const [isLoading, setIsLoading] = useState(false);

  const create = useCallback(async (input: CreateProjectTemplateInput): Promise<ProjectTemplate> => {
    try {
      setIsLoading(true);
      return await createTemplate(input);
    } catch (err) {
      console.error('Error creating template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const update = useCallback(async (id: number, input: Partial<CreateProjectTemplateInput>): Promise<ProjectTemplate> => {
    try {
      setIsLoading(true);
      return await updateTemplate(id, input);
    } catch (err) {
      console.error('Error updating template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    try {
      setIsLoading(true);
      await deleteTemplate(id);
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    createTemplate: create,
    updateTemplate: update,
    deleteTemplate: remove,
    isLoading,
  };
}

interface UseTemplateMaterialsResult {
  materials: TemplateMaterial[];
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useTemplateMaterials(templateId: number | null): UseTemplateMaterialsResult {
  const [materials, setMaterials] = useState<TemplateMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!templateId) {
      setMaterials([]);
      return;
    }
    try {
      setIsLoading(true);
      const result = await getTemplateMaterials(templateId);
      setMaterials(result);
    } catch (err) {
      console.error('Error loading template materials:', err);
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => { load(); }, [load]);

  return { materials, isLoading, refresh: load };
}
