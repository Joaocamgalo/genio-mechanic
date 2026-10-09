import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zalfneaiibpnouyzhxdp.supabase.co';
const supabaseKey = 'sb_publishable_SfphnhaVrJNfmQTwiqre4g_JXqDuJMT';

export const supabase = createClient(supabaseUrl, supabaseKey);
