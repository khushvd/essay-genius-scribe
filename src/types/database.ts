// Extended Supabase types with relationships
import { Database } from '@/integrations/supabase/types';

export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];

// Extend database types with proper relationships
export type EssayWithRelations = Tables['essays']['Row'] & {
  colleges?: Tables['colleges']['Row'];
  programmes?: Tables['programmes']['Row'];
};

export type ProfileWithRole = Tables['profiles']['Row'] & {
  user_roles?: Array<{ role: Enums['app_role'] }>;
};

export type EssayInsert = Tables['essays']['Insert'];
export type EssayUpdate = Tables['essays']['Update'];
export type ProfileInsert = Tables['profiles']['Insert'];
export type ProfileUpdate = Tables['profiles']['Update'];
