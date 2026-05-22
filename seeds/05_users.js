require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

exports.seed = async (knex) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

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
      email: 'gerente.occidente@devicecontrol.com',
      password: 'Gerente2026!',
      fullName: 'Gerente Occidente',
      role: 'branch_manager',
      branch: 'Sucursal Occidente',
    },
    {
      email: 'gerente.oriente@devicecontrol.com',
      password: 'Gerente2026!',
      fullName: 'Gerente Oriente',
      role: 'branch_manager',
      branch: 'Sucursal Oriente',
    },
    {
      email: 'gerente.norte@devicecontrol.com',
      password: 'Gerente2026!',
      fullName: 'Gerente Norte',
      role: 'branch_manager',
      branch: 'Sucursal Norte',
    },
  ];

  for (const u of users) {
    const existing = await knex('profiles').where({ email: u.email }).first();
    if (existing) {
      console.log(`  skip ${u.email} (ya existe)`);
      continue;
    }

    const branchId = u.branch ? branchMap[u.branch] : null;
    if (u.branch && !branchId) {
      console.error(`  ERROR: sucursal "${u.branch}" no encontrada`);
      continue;
    }

    let userId;

    const { data: created, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.fullName },
    });

    if (error) {
      if (!error.message.includes('already been registered')) {
        console.error(`  error ${u.email}:`, error.message);
        continue;
      }
      // Usuario ya existe en Auth — recuperar su ID
      const { data: list } = await supabase.auth.admin.listUsers();
      const found = list?.users?.find(usr => usr.email === u.email);
      if (!found) {
        console.error(`  no se pudo recuperar ID de ${u.email}`);
        continue;
      }
      userId = found.id;
      await supabase.auth.admin.updateUserById(userId, { password: u.password });
      console.log(`  recuperado ${u.email} (ya estaba en Auth, contraseña actualizada)`);
    } else {
      userId = created.user.id;
    }

    await knex('profiles').insert({
      id: userId,
      full_name: u.fullName,
      email: u.email,
      role: u.role,
      branch_id: branchId,
    });

    console.log(`  ✓ ${u.email}`);
  }
};
