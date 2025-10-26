import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }
    
    // Check if user exists in auth.users table
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // Get more users to search through
    })
    
    if (error) {
      console.error('Error checking user:', error)
      return Response.json({ error: 'Failed to check user' }, { status: 500 })
    }
    
    // Find user by email in the results
    const user = users?.users?.find(u => u.email === email)
    const userExists = !!user
    
    return Response.json({ 
      exists: userExists,
      user: user || null
    })
    
  } catch (error) {
    console.error('API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
