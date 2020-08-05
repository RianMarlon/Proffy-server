import { Request, Response } from 'express';

import db from '../database/connection';
import convertHourToMinute from '../utils/convertHourToMinute';

interface ScheduleItem {
  week_day: number,
  from: string,
  to: string
}

export default class ClassesController {
  async create(request: Request, response: Response) {
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
  
    try {
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
  
      return response.status(201).send();
    } catch (err) {
      transaction.rollback();
  
      return response.status(400).json({
        error: 'Unexpected error while creating new class'
      });
    }
  }
}