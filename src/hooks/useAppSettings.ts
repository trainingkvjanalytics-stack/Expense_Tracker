import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  AppSettings,
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

  const formatSettings = (row: any): AppSettings => ({
    id: row.id,
    user_id: row.user_id,
    currency: row.currency_code || 'INR',
    date_format: 'dd/MM/yyyy',
    theme: 'system',
    email_notifications: false,
    budget_alerts: true,
    monthly_budget: null,
    initial_opening_balance: Number(row.initial_opening_balance) || 0,
    initial_balance_date: row.initial_balance_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

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
        setSettings(formatSettings(data));
      } else {
        // Insert default app settings for user if not yet initialized
        const defaultDbPayload = {
          user_id: user.id,
          currency_code: 'INR',
          initial_opening_balance: 0,
          initial_balance_date: null,
        };

        const { data: created, error: insertError } = await supabase
          .from('app_settings')
          .insert(defaultDbPayload)
          .select()
          .maybeSingle();

        if (insertError) {
          console.warn('Could not auto-create app_settings record:', insertError);
          // Still provide fallback object
          setSettings(formatSettings({
            id: '',
            ...defaultDbPayload,
            created_at: new Date().toISOString(),
            updated_at: null,
          }));
        } else if (created) {
          setSettings(formatSettings(created));
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
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (data.currency !== undefined) {
          updatePayload.currency_code = data.currency;
        }
        if (data.initial_opening_balance !== undefined) {
          updatePayload.initial_opening_balance = data.initial_opening_balance;
        }
        if (data.initial_balance_date !== undefined) {
          updatePayload.initial_balance_date = data.initial_balance_date;
        }

        let resultRow: any = null;

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
          resultRow = updated;
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
          resultRow = created;
        }

        toast.success('Settings updated successfully');
        const formatted = formatSettings(resultRow);
        setSettings(formatted);
        return formatted;
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
