import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://sfdcbfvnybwsqhcmbjao.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZGNiZnZueWJ3c3FoY21iamFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjc4MTc5MCwiZXhwIjoyMDQ4MzU3NzkwfQ.j5VqCJqCvN_KHN2eXYy-_PdlpD9mf3MshMdZPFRmfB4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const sql = fs.readFileSync('./sql/billing_tables.sql', 'utf8')

console.log('Running billing tables migration...')

const { data, error } = await supabase.rpc('exec_sql', {
  sql_query: sql
})

if (error) {
  console.error('Error:', error)
  process.exit(1)
} else {
  console.log('Migration successful!')
  console.log(data)
}
