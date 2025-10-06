// Generic realtime subscription hook
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeSubscriptionOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  onUpdate: () => void;
}

export const useRealtimeSubscription = ({
  table,
  filter,
  event = '*',
  schema = 'public',
  onUpdate,
}: UseRealtimeSubscriptionOptions): void => {
  useEffect(() => {
    const channelName = `${table}_changes_${Date.now()}`;
    
    let channel: RealtimeChannel = supabase.channel(channelName);
    
    const config: any = {
      event,
      schema,
      table,
    };
    
    if (filter) {
      config.filter = filter;
    }
    
    channel = channel.on('postgres_changes', config, onUpdate);
    
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, event, schema, onUpdate]);
};
