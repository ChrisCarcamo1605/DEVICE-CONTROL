exports.seed = async (knex) => {
  await knex('branches').del();
  const [tgp, sps] = await knex('locations')
    .whereIn('name', ['Tegucigalpa', 'San Pedro Sula'])
    .select('id', 'name');

  await knex('branches').insert([
    { name: 'Sucursal Central', address: 'Col. Escalón, San Salvador', location_id: tgp.id, phone: '+504 2222-0001' },
    { name: 'Sucursal Norte', address: 'Blvd. del Ejército, Santa Ana', location_id: sps.id, phone: '+504 2222-0002' },
  ]);
};
