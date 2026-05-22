exports.seed = async (knex) => {
  const rows = [
    { name: 'San Salvador', department: 'San Salvador', country: 'El Salvador' },
    { name: 'Santa Ana',    department: 'Santa Ana',    country: 'El Salvador' },
    { name: 'San Miguel',   department: 'San Miguel',   country: 'El Salvador' },
    { name: 'Apopa',        department: 'San Salvador', country: 'El Salvador' },
  ];

  const existing = await knex('locations').select('name');
  const existingNames = new Set(existing.map(l => l.name));
  const toInsert = rows.filter(r => !existingNames.has(r.name));

  if (toInsert.length) await knex('locations').insert(toInsert);
  console.log(`  locations: ${toInsert.length} insertadas, ${existing.length} ya existían`);
};
