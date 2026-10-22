import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Category,
  CategoryInsert,
  CategoryUpdate,
  Subcategory,
  SubcategoryInsert,
} from '@/types/database';

export interface UseCategoriesReturn {
  categories: Category[];
  subcategories: Subcategory[];
  loading: boolean;
  error: string | null;
  createCategory: (data: Omit<CategoryInsert, 'user_id'> & { user_id?: string | null }) => Promise<Category | null>;
  updateCategory: (id: string, data: CategoryUpdate) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
  createSubcategory: (data: Omit<SubcategoryInsert, 'user_id'> & { user_id?: string | null }) => Promise<Subcategory | null>;
  deleteSubcategory: (id: string) => Promise<boolean>;
  getCategoriesByType: (type: 'income' | 'expense' | 'investment') => Category[];
  refetch: () => Promise<void>;
}

export function useCategories(): UseCategoriesReturn {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoriesAndSubcategories = useCallback(async () => {
    if (!user?.id) {
      setCategories([]);
      setSubcategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch categories for current authenticated user
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (catError) {
        throw catError;
      }

      // Fetch subcategories
      const { data: subData, error: subError } = await supabase
        .from('subcategories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (subError) {
        throw subError;
      }

      const mappedCategories: Category[] = (catData || []).map((c: any) => ({
        ...c,
        type: c.transaction_type || c.type,
        is_system: Boolean(c.is_default || c.is_system),
        is_default: Boolean(c.is_default || c.is_system),
      }));

      setCategories(mappedCategories);
      setSubcategories(subData || []);
    } catch (err: unknown) {
      console.error('Failed to fetch categories:', err);
      const message =
        (err as any)?.message ||
        (err instanceof Error ? err.message : 'Failed to fetch categories');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCategoriesAndSubcategories();
  }, [fetchCategoriesAndSubcategories]);

  const getCategoriesByType = useCallback(
    (type: 'income' | 'expense' | 'investment'): Category[] => {
      return categories.filter((c) => c.type === type);
    },
    [categories]
  );

  const createCategory = useCallback(
    async (
      data: Omit<CategoryInsert, 'user_id'> & { user_id?: string | null }
    ): Promise<Category | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to create a category');
        return null;
      }

      try {
        const payload: any = {
          user_id: user.id,
          name: data.name,
          transaction_type: (data as any).transaction_type || data.type,
          color: data.color || '#3b82f6',
          icon: data.icon || 'tag',
          is_default: false,
        };

        const { data: created, error: createError } = await supabase
          .from('categories')
          .insert(payload)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        toast.success('Category created successfully');
        await fetchCategoriesAndSubcategories();
        return {
          ...created,
          type: created.transaction_type || created.type,
          is_system: Boolean(created.is_default),
        };
      } catch (err: unknown) {
        console.error('Failed to create category:', err);
        const message =
          (err as any)?.message ||
          (err instanceof Error ? err.message : 'Failed to create category');
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchCategoriesAndSubcategories]
  );

  const updateCategory = useCallback(
    async (id: string, data: CategoryUpdate): Promise<Category | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to update a category');
        return null;
      }

      try {
        const target = categories.find((c) => c.id === id);
        if (target?.is_system) {
          toast.error('Default system categories cannot be modified');
          return null;
        }

        const updatePayload: any = {};
        if (data.name !== undefined) updatePayload.name = data.name;
        if (data.type !== undefined || (data as any).transaction_type !== undefined) {
          updatePayload.transaction_type = (data as any).transaction_type || data.type;
        }
        if (data.color !== undefined) updatePayload.color = data.color;
        if (data.icon !== undefined) updatePayload.icon = data.icon;

        const { data: updated, error: updateError } = await supabase
          .from('categories')
          .update(updatePayload)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        toast.success('Category updated successfully');
        await fetchCategoriesAndSubcategories();
        return {
          ...updated,
          type: updated.transaction_type || updated.type,
          is_system: Boolean(updated.is_default),
        };
      } catch (err: unknown) {
        console.error('Failed to update category:', err);
        const message =
          (err as any)?.message ||
          (err instanceof Error ? err.message : 'Failed to update category');
        toast.error(message);
        return null;
      }
    },
    [user?.id, categories, fetchCategoriesAndSubcategories]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) {
        toast.error('You must be logged in to delete a category');
        return false;
      }

      try {
        const target = categories.find((c) => c.id === id);
        if (target?.is_system) {
          toast.error('System categories cannot be deleted');
          return false;
        }

        // Delete associated user subcategories first
        await supabase
          .from('subcategories')
          .delete()
          .eq('category_id', id)
          .eq('user_id', user.id);

        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        toast.success('Category deleted successfully');
        await fetchCategoriesAndSubcategories();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete category';
        toast.error(message);
        return false;
      }
    },
    [user?.id, categories, fetchCategoriesAndSubcategories]
  );

  const createSubcategory = useCallback(
    async (
      data: Omit<SubcategoryInsert, 'user_id'> & { user_id?: string | null }
    ): Promise<Subcategory | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to create a subcategory');
        return null;
      }

      try {
        const payload: SubcategoryInsert = {
          ...data,
          user_id: user.id,
        };

        const { data: created, error: createError } = await supabase
          .from('subcategories')
          .insert(payload)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        toast.success('Subcategory created successfully');
        await fetchCategoriesAndSubcategories();
        return created;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create subcategory';
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchCategoriesAndSubcategories]
  );

  const deleteSubcategory = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) {
        toast.error('You must be logged in to delete a subcategory');
        return false;
      }

      try {
        const { error: deleteError } = await supabase
          .from('subcategories')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        toast.success('Subcategory deleted successfully');
        await fetchCategoriesAndSubcategories();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete subcategory';
        toast.error(message);
        return false;
      }
    },
    [user?.id, fetchCategoriesAndSubcategories]
  );

  return {
    categories,
    subcategories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubcategory,
    deleteSubcategory,
    getCategoriesByType,
    refetch: fetchCategoriesAndSubcategories,
  };
}
