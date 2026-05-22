exports.seed = async (knex) => {
  await knex('locations').del();
  await knex('locations').insert([
    { name: 'San Salvador',  department: 'San Salvador',  country: 'El Salvador' },
    { name: 'Santa Ana',     department: 'Santa Ana',     country: 'El Salvador' },
    { name: 'San Miguel',    department: 'San Miguel',    country: 'El Salvador' },
    { name: 'Sonsonate',     department: 'Sonsonate',     country: 'El Salvador' },
    { name: 'La Libertad',   department: 'La Libertad',   country: 'El Salvador' },
    { name: 'Chalatenango',  department: 'Chalatenango',  country: 'El Salvador' },
  ]);
};
