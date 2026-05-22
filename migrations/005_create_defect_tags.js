exports.up = (knex) =>
  knex.schema.createTable('defect_tags', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable().unique();
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('defect_tags');
