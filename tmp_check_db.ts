import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function check() {
    console.log('Checking Supabase connection...');
    const { data, error } = await supabase.from('notifications').select('count', { count: 'exact', head: true });
    if (error) {
        console.error('Error connecting to notifications table:', error);
    } else {
        console.log('Notifications table exists. Count:', data);
    }

    const { data: products, error: prodError } = await supabase.from('products').select('id').limit(1);
    if (prodError) {
        console.error('Error connecting to products table:', prodError);
    } else {
        console.log('Products table exists. First product ID:', products[0]?.id);
    }
    process.exit(0);
}

check();
