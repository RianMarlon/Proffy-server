import express from 'express';
import db from './database/connection';
import convertHourToMinute from './utils/convertHourToMinute';

const routes = express.Router();

interface ScheduleItem {
  week_day: number,
  from: string,
  to: string
}

routes.post('/classes', async (request, response) => {
  const {
    name,
    avatar,
    whatsapp,
    biography,
    subject,
    cost,
    schedules
  } = request.body;

  const transaction = await db.transaction();

  const insertedUsersIds = await transaction('users').insert({
    name,
    avatar,
    whatsapp,
    biography
  });

  const id_user = insertedUsersIds[0];

  const insertedClassesIds = await transaction('classes').insert({
    subject,
    cost,
    id_user
  });

  const id_class = insertedClassesIds[0];

  const classSchedules = schedules.map((scheduleItem: ScheduleItem) => {
    return {
      week_day: scheduleItem.week_day,
      from: convertHourToMinute(scheduleItem.from),
      to: convertHourToMinute(scheduleItem.to),
      id_class
    };
  });

  await transaction('class_schedules').insert(classSchedules);

  await transaction.commit();

  return response.send();
});

export default routes;