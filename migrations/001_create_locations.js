exports.up = (knex) =>
  knex.schema.createTable('locations', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('department').notNullable();
    t.text('country').notNullable().defaultTo('Honduras');
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('locations');
