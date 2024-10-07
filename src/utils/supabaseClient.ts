import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mthvthhzdamgjtrhgjlh.supabase.co';
const supabaseAnonKey = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10aHZ0aGh6ZGFtZ2p0cmhnamxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgyNjMzMzcsImV4cCI6MjA0MzgzOTMzN30.bHejAeYZXIfABxmpejxwnuDUSonkA8xv1sZfWelFR7E`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
