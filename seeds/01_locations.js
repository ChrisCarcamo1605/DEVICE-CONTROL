exports.seed = async (knex) => {
  await knex('locations').del();
  await knex('locations').insert([
    { name: 'Tegucigalpa',  department: 'Francisco Morazán',  country: 'Honduras' },
    { name: 'San Pedro Sula', department: 'Cortés', country: 'Honduras' },
    { name: 'Choloma', department: 'Cortés', country: 'Honduras' },
    { name: 'Comayagua', department: 'Comayagua', country: 'Honduras' },
    { name: 'La Ceiba', department: 'Atlántida', country: 'Honduras' },
    { name: 'Santa Rosa de Copán', department: 'Copán', country: 'Honduras' },
  ]);
};
