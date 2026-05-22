exports.up = (knex) =>
  knex.schema.createTable('devices', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.text('name').notNullable();
    t.text('serial_number').unique();
    t.uuid('category_id').references('id').inTable('device_categories').onDelete('SET NULL');
    t.uuid('branch_id').notNullable().references('id').inTable('branches').onDelete('RESTRICT');
    t.uuid('parent_device_id').references('id').inTable('devices').onDelete('SET NULL');
    t.uuid('assigned_by').references('id').inTable('profiles').onDelete('SET NULL');
    t.decimal('value', 10, 2);
    t.date('purchase_date');
    t.text('invoice_number');
    t.text('status').notNullable().defaultTo('active')
      .checkIn(['active', 'in_repair', 'replaced', 'retired']);
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('devices');
