exports.up = (knex) =>
  knex.schema.createTable('device_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable().unique();
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('device_categories');
