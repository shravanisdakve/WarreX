import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkTables() {
    console.log('--- Supabase Connection Status ---');

    // 1. Check users table
    const { count, error: userError } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (userError) console.error('Users Table Error:', userError.message);
    else console.log('✅ Users table exists. Count:', count);

    // 2. Check assistant_chats table
    const { count: chatCount, error: chatError } = await supabase.from('assistant_chats').select('*', { count: 'exact', head: true });
    if (chatError) console.error('AssistantChats Table Error:', chatError.message);
    else console.log('✅ assistant_chats table exists. Count:', chatCount);

    // 3. Try a test insert into assistant_chats if possible (careful with foreign keys)
    // We need a valid user_id
    const { data: userData } = await supabase.from('users').select('id').limit(1).single();
    if (userData) {
        console.log('Attempting test insert for user:', userData.id);
        const { error: insError } = await supabase.from('assistant_chats').insert({
            user_id: userData.id,
            message: 'TEST_CHECK',
            response: 'TABLE_CHECK_OK',
            model_used: 'CHECKER'
        });
        if (insError) console.error('Insert Error:', insError.message);
        else console.log('✅ Test insert successful!');
    } else {
        console.log('No user found to perform test insert.');
    }
}

checkTables();
