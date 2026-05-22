exports.seed = async (knex) => {
  const locations = await knex('locations').select('id', 'name');
  const loc = Object.fromEntries(locations.map(l => [l.name, l.id]));

  const rows = [
    {
      name: 'Sucursal Central',
      address: 'Col. Escalón, Calle La Mascota #204, San Salvador',
      location_id: loc['San Salvador'],
      phone: '+503 2222-0001',
    },
    {
      name: 'Sucursal Occidente',
      address: '2ª Av. Sur #18, Barrio El Calvario, Santa Ana',
      location_id: loc['Santa Ana'],
      phone: '+503 2441-0002',
    },
    {
      name: 'Sucursal Oriente',
      address: 'Av. Roosevelt #55, Barrio San Francisco, San Miguel',
      location_id: loc['San Miguel'],
      phone: '+503 2661-0003',
    },
    {
      name: 'Sucursal Norte',
      address: 'Col. Satélite, Blvd. Ejército Nacional #12, Apopa',
      location_id: loc['Apopa'],
      phone: '+503 2215-0004',
    },
  ];

  const existing = await knex('branches').select('name');
  const existingNames = new Set(existing.map(b => b.name));
  const toInsert = rows.filter(r => !existingNames.has(r.name));

  if (toInsert.length) await knex('branches').insert(toInsert);
  console.log(`  branches: ${toInsert.length} insertadas, ${existing.length} ya existían`);
};
