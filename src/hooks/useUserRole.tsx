import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = (userId: string | undefined) => {
  const [role, setRole] = useState<'free' | 'premium' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('free'); // Default to free if error
        } else {
          setRole(data?.role || 'free');
        }
      } catch (err) {
        console.error('Error in fetchRole:', err);
        setRole('free');
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [userId]);

  return { role, loading, isAdmin: role === 'admin' };
};
