import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Service role client for server-side operations (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
