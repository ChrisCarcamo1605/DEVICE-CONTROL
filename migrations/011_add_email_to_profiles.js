exports.up = (knex) =>
  knex.schema.alterTable('profiles', (t) => {
    t.text('email');
  });

exports.down = (knex) =>
  knex.schema.alterTable('profiles', (t) => {
    t.dropColumn('email');
  });
