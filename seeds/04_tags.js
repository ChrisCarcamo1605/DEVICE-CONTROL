exports.seed = async (knex) => {
  const rows = [
    { name: 'No enciende' },
    { name: 'Pantalla dañada' },
    { name: 'Fallo de disco' },
    { name: 'Sobrecalentamiento' },
    { name: 'Sin conectividad' },
    { name: 'Daño físico' },
    { name: 'Derrame de líquido' },
    { name: 'Fallo de batería' },
    { name: 'Error de sistema' },
    { name: 'Atasco de papel' },
  ];

  const existing = await knex('defect_tags').select('name');
  const existingNames = new Set(existing.map(t => t.name));
  const toInsert = rows.filter(r => !existingNames.has(r.name));

  if (toInsert.length) await knex('defect_tags').insert(toInsert);
  console.log(`  tags: ${toInsert.length} insertadas, ${existing.length} ya existían`);
};
