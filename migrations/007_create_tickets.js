exports.up = (knex) =>
  knex.schema.createTable('tickets', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('device_id').notNullable().references('id').inTable('devices').onDelete('RESTRICT');
    t.uuid('branch_id').notNullable().references('id').inTable('branches').onDelete('RESTRICT');
    t.uuid('reported_by').notNullable().references('id').inTable('profiles').onDelete('RESTRICT');
    t.uuid('it_manager_id').references('id').inTable('profiles').onDelete('SET NULL');
    t.text('status').notNullable().defaultTo('pending')
      .checkIn(['pending', 'in_diagnosis', 'waiting_parts', 'in_repair', 'finalized', 'cancelled', 'delivered']);
    t.text('problem_description').notNullable();
    t.timestamp('report_date').notNullable().defaultTo(knex.fn.now());
    t.timestamp('collection_date');
    t.timestamp('collection_done_at');
    t.timestamp('return_date');
    t.timestamp('return_done_at');
    t.text('resolution_notes');
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('tickets');
