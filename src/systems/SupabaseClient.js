import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qaxrvvqirmbzhglbypvs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zxYv89NfgJbsaKSB_ZT6Yg_gsRQu8LD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
