import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function deleteUserByEmail(email: string) {
  // 1) Delete employee record(s)
  await supabaseAdmin
    .from('employees')
    .delete()
    .eq('email', email)

  // 2) Find auth user by email and delete
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    perPage: 1000
  })

  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = users.find(u => u.email === email)
  if (user) {
    await supabaseAdmin.auth.admin.deleteUser(user.id)
    console.log(`Deleted auth user and employee for ${email}`)
  } else {
    console.log(`No auth user found for ${email}`)
  }
}

async function run() {
  await deleteUserByEmail('tgarrick969@gmail.com')
  await deleteUserByEmail('tracy@virtual24.ca')
}

run().catch(console.error)
