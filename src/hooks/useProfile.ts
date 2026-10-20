import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, ProfileInsert, ProfileUpdate } from '@/types/database';

export interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (data: ProfileUpdate) => Promise<Profile | null>;
  refetch: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setProfile(data);
      } else {
        // Auto-provision profile from auth user metadata if not present
        const initialProfile: ProfileInsert = {
          id: user.id,
          email: user.email || '',
          full_name: (user.user_metadata?.full_name as string) || null,
          avatar_url: (user.user_metadata?.avatar_url as string) || null,
        };

        const { data: created, error: insertError } = await supabase
          .from('profiles')
          .insert(initialProfile)
          .select()
          .maybeSingle();

        if (insertError) {
          console.warn('Could not auto-create profile record:', insertError);
          setProfile({
            id: user.id,
            email: user.email || '',
            full_name: (user.user_metadata?.full_name as string) || null,
            avatar_url: (user.user_metadata?.avatar_url as string) || null,
            created_at: new Date().toISOString(),
            updated_at: null,
          });
        } else if (created) {
          setProfile(created);
        }
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch user profile';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, user?.user_metadata]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (data: ProfileUpdate): Promise<Profile | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to update your profile');
        return null;
      }

      try {
        const payload: ProfileUpdate = {
          ...data,
          updated_at: new Date().toISOString(),
        };

        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email || '',
            ...payload,
          })
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        toast.success('Profile updated successfully');
        setProfile(updated);
        return updated;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update profile';
        toast.error(message);
        return null;
      }
    },
    [user?.id, user?.email]
  );

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile,
  };
}
