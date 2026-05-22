exports.seed = async (knex) => {
  const rows = [
    { name: 'Computadora de escritorio' },
    { name: 'Laptop' },
    { name: 'Componente' },
    { name: 'Monitor' },
    { name: 'Impresora' },
    { name: 'Teléfono IP' },
    { name: 'Switch' },
    { name: 'UPS' },
  ];

  const existing = await knex('device_categories').select('name');
  const existingNames = new Set(existing.map(c => c.name));
  const toInsert = rows.filter(r => !existingNames.has(r.name));

  if (toInsert.length) await knex('device_categories').insert(toInsert);
  console.log(`  categories: ${toInsert.length} insertadas, ${existing.length} ya existían`);
};
