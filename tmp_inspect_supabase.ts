import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function inspectData() {
    console.log('--- Inspecting Data ---');

    // 1. Get first user
    const { data: user } = await supabase.from('users').select('*').limit(1).single();
    console.log('User Sample:', user);

    // 2. Get first product and check its user_id
    const { data: product } = await supabase.from('products').select('*').limit(1).single();
    console.log('Product Sample:', product);

    // 3. Check assistant_chats columns
    const { data: chats } = await supabase.from('assistant_chats').select('*').limit(1);
    console.log('Chat Sample:', chats);
}

inspectData();
