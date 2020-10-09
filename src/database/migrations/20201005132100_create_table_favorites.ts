import Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('favorites', (table) => {
    table.integer('id_user')
      .notNullable()
      .references('id')
      .inTable('users')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table.integer('id_class')
      .notNullable()
      .references('id')
      .inTable('classes')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table.primary(['id_user', 'id_class']);
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable('favorites');
}
