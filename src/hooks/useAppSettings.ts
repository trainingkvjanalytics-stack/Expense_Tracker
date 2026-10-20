import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  AppSettings,
  AppSettingsInsert,
  AppSettingsUpdate,
} from '@/types/database';

export interface UseAppSettingsReturn {
  settings: AppSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (data: AppSettingsUpdate) => Promise<AppSettings | null>;
  refetch: () => Promise<void>;
}

export function useAppSettings(): UseAppSettingsReturn {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) {
      setSettings(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setSettings(data);
      } else {
        // Insert default app settings for user if not yet initialized
        const defaultSettings: AppSettingsInsert = {
          user_id: user.id,
          currency: 'INR',
          date_format: 'dd/MM/yyyy',
          theme: 'system',
          email_notifications: false,
          budget_alerts: true,
          monthly_budget: null,
          initial_opening_balance: 0,
          initial_balance_date: null,
        };

        const { data: created, error: insertError } = await supabase
          .from('app_settings')
          .insert(defaultSettings)
          .select()
          .maybeSingle();

        if (insertError) {
          console.warn('Could not auto-create app_settings record:', insertError);
          // Still provide fallback object
          setSettings({
            id: '',
            ...defaultSettings,
            created_at: new Date().toISOString(),
            updated_at: null,
          } as AppSettings);
        } else if (created) {
          setSettings(created);
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch app settings';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(
    async (data: AppSettingsUpdate): Promise<AppSettings | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to update settings');
        return null;
      }

      try {
        const updatePayload: AppSettingsUpdate = {
          ...data,
          updated_at: new Date().toISOString(),
        };

        let result: AppSettings | null = null;

        if (settings?.id) {
          const { data: updated, error: updateError } = await supabase
            .from('app_settings')
            .update(updatePayload)
            .eq('id', settings.id)
            .eq('user_id', user.id)
            .select()
            .single();

          if (updateError) {
            throw updateError;
          }
          result = updated;
        } else {
          const { data: created, error: createError } = await supabase
            .from('app_settings')
            .upsert({
              ...updatePayload,
              user_id: user.id,
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }
          result = created;
        }

        toast.success('Settings updated successfully');
        setSettings(result);
        return result;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update settings';
        toast.error(message);
        return null;
      }
    },
    [user?.id, settings?.id]
  );

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}
