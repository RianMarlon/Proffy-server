import { Request, Response } from 'express';

import db from '../database/connection';
import convertHourToMinute from '../utils/convertHourToMinute';
import convertMinutesToTime from '../utils/convertMinutesToTime';
import convertNumberToWeekDay from '../utils/convertNumberToWeekDay';

interface ClassItem {
  id: number,
  subject: string,
  cost: number,
  id_user: number,
  name: string,
  avatar: string
  whatsapp: string,
  biography: string,
  id_class: number,
  week_day: number,
  from: number,
  to: number,
}

interface ClassWithSchedules {
  id: number,
  subject: string,
  cost: number,
  id_user: number,
  name: string,
  avatar: string
  whatsapp: string,
  biography: string,
  id_class: number,
  schedules: [{  
    id: number,
    week_day: string,
    from: string,
    to: string,
  }],
}

interface ScheduleItem {
  week_day: number,
  from: string,
  to: string,
}

export default class ClassesControllers {
  static convertByIdToWithSchedules(classes: ClassItem[]) {
    const data: ClassWithSchedules = {
      id: 0,
      subject: '',
      cost: 0,
      id_user: 0,
      name: '',
      avatar: '',
      whatsapp: '',
      biography: '',
      id_class: 0,
      schedules: [{
        id: 0,
        week_day: '',
        from: '',
        to: '',
      }],
    }
  
    classes.forEach((classItem: ClassItem, index: number) => {
      const schedule = {
        id: classItem.id,
        week_day: convertNumberToWeekDay(classItem.week_day),
        from: convertMinutesToTime(classItem.from),
        to: convertMinutesToTime(classItem.to),
      }
  
      if (index === 0) {
        data.id = classItem.id;
        data.subject = classItem.subject;
        data.cost = classItem.cost;
        data.id_user = classItem.id_user;
        data.name = classItem.name;
        data.avatar = classItem.avatar;
        data.whatsapp = classItem.whatsapp;
        data.biography = classItem.biography;
        data.id_class = classItem.id_class;
        data.schedules = [{ ...schedule }];
      }
  
      else {
        data.schedules.push({ ...schedule });
      }
    });
  
    return { ...data };
  }

  async index(request: Request, response: Response) {
    const filters = request.query;

    const subject = filters.subject as string;
    const week_day = filters.week_day as string;
    const time = filters.time as string;
    
    const page = parseInt(filters.page as string);
    const perPage = parseInt(filters.per_page as string);

    const timeInMinutes = convertHourToMinute(time);

    const limit = perPage;
    const offset = perPage * (page - 1);

    const whereSubject = await db('classes')
      .where('subject', '=', subject).toString();

    const subselectClasses = subject.trim() === ''
      ? 'select * from classes'
      : whereSubject
    ;

    const queryAllClasses = db('classes')
      .whereExists(function() {
        this.select('class_schedules.*')
          .from('class_schedules')
          .whereRaw('`class_schedules`.`id_class` = `classes`.`id`')

        if (week_day) {
          this.whereRaw('`class_schedules`.`week_day` = ??', [Number(week_day)]);
        }

        if (timeInMinutes) {
          this.whereRaw('`class_schedules`.`from` <= ??', [timeInMinutes]);
          this.whereRaw('`class_schedules`.`to` > ??', [timeInMinutes]);
        }
      })      
      .join('users', 'classes.id_user', '=', 'users.id')
      .join('class_schedules', 'classes.id', '=', 'class_schedules.id_class');

    const classesByPage = await queryAllClasses
      .select(['users.*', 'classes.*', 'class_schedules.*'])
      .from(db.raw(`(${subselectClasses} limit ?? offset ??) as classes`, [
        limit, offset
      ]))
      .orderBy(['classes.id', 'class_schedules.week_day', 'class_schedules.to']);

    const countTeachers = await db('users')
      .join('classes', 'classes.id_user', '=', 'users.id')
      .countDistinct('users.id');

    const countClasses = await queryAllClasses
      .countDistinct('classes.id')
      .from(db.raw(`(${subselectClasses}) as classes`));

    const quantityTeachers = countTeachers[0]['count(distinct `users`.`id`)'];
    const quantityClasses = countClasses[0]['count(distinct `classes`.`id`)'];

    const classesIds: number[] = [];
    const classesWithSchedules: ClassWithSchedules[] = [];

    classesByPage.forEach((classItem: ClassItem) => {
      if(!classesIds.includes(classItem.id_class)) {
        classesIds.push(classItem.id_class);
      }
    });

    classesIds.forEach((classId: number) => {
      const classesById = classesByPage.filter((classItem: ClassItem) => {
        return classId === classItem.id_class;
      });

      const classWithSchedules = ClassesController.convertByIdToWithSchedules(classesById);

      classesWithSchedules.push({ ...classWithSchedules });
    });

    const classesWithSchedulesData = {
      classesByPage: [
       ...classesWithSchedules
      ],
      quantityTeachers,
      quantityClasses,
    };

    return response.json(classesWithSchedulesData);
  }

  async create(request: Request, response: Response) {
    const {
      name,
      avatar,
      whatsapp,
      biography,
      subject,
      cost,
      schedules,
    } = request.body;
  
    const transaction = await db.transaction();
  
    try {
      const insertedUsersIds = await transaction('users').insert({
        name,
        avatar,
        whatsapp,
        biography,
      });
  
      const id_user = insertedUsersIds[0];
  
      const insertedClassesIds = await transaction('classes').insert({
        subject,
        cost,
        id_user,
      });
  
      const id_class = insertedClassesIds[0];
  
      const classSchedules = schedules.map((scheduleItem: ScheduleItem) => {
        return {
          week_day: scheduleItem.week_day,
          from: convertHourToMinute(scheduleItem.from),
          to: convertHourToMinute(scheduleItem.to),
          id_class,
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