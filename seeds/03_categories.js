exports.seed = async (knex) => {
  await knex('device_categories').del();
  await knex('device_categories').insert([
    { name: 'Computadora de escritorio' },
    { name: 'Laptop' },
    { name: 'Monitor' },
    { name: 'Impresora' },
    { name: 'Teléfono IP' },
    { name: 'Switch' },
    { name: 'UPS' },
    { name: 'Componente' },
  ]);
};
