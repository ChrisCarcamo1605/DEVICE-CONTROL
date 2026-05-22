exports.up = (knex) =>
  knex.schema.createTable('branches', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('address');
    t.uuid('location_id').references('id').inTable('locations').onDelete('SET NULL');
    t.text('phone');
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('branches');
