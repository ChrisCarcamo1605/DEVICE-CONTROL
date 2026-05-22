exports.up = (knex) =>
  knex.schema.createTable('maintenance_history', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('device_id').notNullable().references('id').inTable('devices').onDelete('RESTRICT');
    t.uuid('ticket_id').references('id').inTable('tickets').onDelete('SET NULL');
    t.uuid('it_manager_id').notNullable().references('id').inTable('profiles').onDelete('RESTRICT');
    t.text('action').notNullable()
      .checkIn(['diagnosis', 'repair', 'replace', 'new_purchase']);
    t.text('observations');
    t.text('diagnosis');
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('maintenance_history');
