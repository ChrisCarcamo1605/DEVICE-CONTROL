exports.up = (knex) =>
  knex.schema.createTable('profiles', (t) => {
    t.uuid('id').primary();
    t.text('full_name').notNullable();
    t.text('role').notNullable().checkIn(['it_manager', 'branch_manager']);
    t.uuid('branch_id').references('id').inTable('branches').onDelete('SET NULL');
    t.timestamps(true, true);
  });

exports.down = (knex) => knex.schema.dropTable('profiles');
