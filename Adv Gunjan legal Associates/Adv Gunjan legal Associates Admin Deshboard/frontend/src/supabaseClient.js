import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not defined. Set them in frontend/.env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
