require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const knex = require('knex')(require('../knexfile').development);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createUser(email, password, fullName, role, branchId) {
  const existing = await knex('profiles').where({ email }).first();
  if (existing) {
    console.log(`  skip ${email} (ya existe)`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    console.error(`  error ${email}:`, error.message);
    return null;
  }

  await knex('profiles').insert({
    id: data.user.id,
    full_name: fullName,
    email,
    role,
    branch_id: branchId ?? null,
  });

  console.log(`  ✓ ${email}`);
  return data.user.id;
}

async function main() {
  const branches = await knex('branches').select('id', 'name');
  const branchMap = Object.fromEntries(branches.map(b => [b.name, b.id]));

  const users = [
    {
      email: 'admin@devicecontrol.com',
      password: 'Admin2026!',
      fullName: 'Administrador IT',
      role: 'it_manager',
      branch: null,
    },
    {
      email: 'gerente@devicecontrol.com',
      password: 'Gerente2026!',
      fullName: 'Gerente Central',
      role: 'branch_manager',
      branch: 'Sucursal Central',
    },
    {
      email: 'gerente.norte@devicecontrol.com',
      password: 'Gerente2026!',
      fullName: 'Gerente Norte',
      role: 'branch_manager',
      branch: 'Sucursal Norte',
    },
    {
      email: 'gerente.choloma@devicecontrol.com',
      password: 'Gerente2026!',
      fullName: 'Gerente Choloma',
      role: 'branch_manager',
      branch: 'Sucursal Choloma',
    },
    {
      email: 'gerente.comayagua@devicecontrol.com',
      password: 'Gerente2026!',
      fullName: 'Gerente Comayagua',
      role: 'branch_manager',
      branch: 'Sucursal Comayagua',
    },
  ];

  console.log('\nCreando usuarios...');
  for (const u of users) {
    const branchId = u.branch ? branchMap[u.branch] : null;
    if (u.branch && !branchId) {
      console.error(`  ERROR: sucursal "${u.branch}" no encontrada en DB`);
      continue;
    }
    await createUser(u.email, u.password, u.fullName, u.role, branchId);
  }

  console.log('\n✅ Usuarios creados.');
  await knex.destroy();
}

main().catch(e => { console.error(e); process.exit(1); });
