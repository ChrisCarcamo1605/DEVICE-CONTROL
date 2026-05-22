exports.up = (knex) =>
  knex.schema.createTable('purchases', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('ticket_id').references('id').inTable('tickets').onDelete('SET NULL');
    t.uuid('it_manager_id').notNullable().references('id').inTable('profiles').onDelete('RESTRICT');
    t.uuid('branch_id').notNullable().references('id').inTable('branches').onDelete('RESTRICT');
    t.text('type').notNullable().checkIn(['spare_part', 'new_device']);
    t.text('description').notNullable();
    t.decimal('amount', 10, 2).notNullable();
    t.text('invoice_number');
    t.date('purchase_date').notNullable();
    t.uuid('new_device_id').references('id').inTable('devices').onDelete('SET NULL');
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('purchases');
