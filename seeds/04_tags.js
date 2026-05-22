exports.seed = async (knex) => {
  await knex('defect_tags').del();
  await knex('defect_tags').insert([
    { name: 'Mojado' },
    { name: 'Roto' },
    { name: 'Falla eléctrica' },
    { name: 'Sobrecalentamiento' },
    { name: 'Sin encender' },
    { name: 'Pantalla dañada' },
    { name: 'Teclado dañado' },
    { name: 'Virus/Malware' },
    { name: 'Falla de disco' },
    { name: 'Memoria RAM' },
  ]);
};
