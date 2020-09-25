import Knex from 'knex';

export async function up(knex: Knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password').notNullable();
    table.string('avatar');
    table.string('whatsapp');
    table.string('biography');
  });
}

export async function down(knex: Knex) {
  return knex.schema.dropTable('users');
}
