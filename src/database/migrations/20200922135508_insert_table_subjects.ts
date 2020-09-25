import Knex from 'knex';

export async function up(knex: Knex) {
  return knex('subjects').insert([
    { subject: 'Português' },
    { subject: 'Redação' },
    { subject: 'Matemática' },
    { subject: 'Física' },
    { subject: 'Química' },
    { subject: 'Biologia' },
    { subject: 'História' },
    { subject: 'Geografia' },
    { subject: 'Filosofia' },
    { subject: 'Sociologia' },
    { subject: 'Inglês' },
    { subject: 'Espanhol' },
    { subject: 'Educação Física' },
    { subject: 'Artes' },
  ]);
}

export async function down(knex: Knex) {
  return knex.delete('subjects');
}
