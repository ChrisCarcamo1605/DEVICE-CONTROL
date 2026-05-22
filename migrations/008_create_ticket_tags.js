exports.up = (knex) =>
  knex.schema.createTable('ticket_tags', (t) => {
    t.uuid('ticket_id').notNullable().references('id').inTable('tickets').onDelete('CASCADE');
    t.uuid('tag_id').notNullable().references('id').inTable('defect_tags').onDelete('CASCADE');
    t.primary(['ticket_id', 'tag_id']);
  });

exports.down = (knex) => knex.schema.dropTable('ticket_tags');
