import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';

import db from '../database/connection';
import convertHourToMinute from '../utils/convertHourToMinute';
import convertMinutesToTime from '../utils/convertMinutesToTime';
import convertNumberToWeekDay from '../utils/convertNumberToWeekDay';
import { existOrError, notExistOrError } from '../utils/validate';

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

const { authSecret } = require('../../.env');

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

export default class ClassesController {
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

  async getWithSchedules(request: Request, response: Response) {
    const filters = request.query;

    const subject = filters.subject as string;
    const week_day = filters.week_day as string;
    const time = filters.time as string;
    
    const page = parseInt(filters.page as string) || 1;
    const perPage = parseInt(filters.per_page as string) || 1;

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

  async insert(request: Request, response: Response) {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return response.status(401).json({
        error: 'Acesso não autorizado!',
      });
    }

    const [scheme, token] = authHeader.split(" ");
    const userOfToken: any = await promisify(jwt.verify)(token, authSecret);

    const {
      avatar,
      biography,
      whatsapp,
      subject,
      cost,
      schedules,
    } = request.body;

    const id_user = userOfToken.id;

    const classByIdUser = await db('classes').select("*")
      .where("id_user", "=", id_user)
      .first();
  
    const transaction = await db.transaction();
        
    try {
      notExistOrError(classByIdUser, "Usuário já possui aula cadastrada!");
      existOrError(avatar, "Avatar não fornecido!");
      existOrError(biography, "Biografia não informada!");
      existOrError(whatsapp, "Whatsapp não informado!");
      existOrError(subject, "Matéria não informada!");
      existOrError(cost, "Preço não informado!");
      existOrError(schedules, "Horário(s) não informado(s)!");

      await transaction('users').update({
          avatar,
          biography,
          whatsapp,
        })
        .where("id", "=", id_user);
  
      const insertedClassesIds = await transaction('classes').insert({
        subject,
        cost,
        id_user,
      });
  
      const id_class = insertedClassesIds[0];
  
      const classSchedules = schedules.map((scheduleItem: ScheduleItem) => {
        existOrError(scheduleItem.week_day, "Dia da semana não informado!");
        existOrError(scheduleItem.from, "Horário inicial não informado!");
        existOrError(scheduleItem.to, "Horário final não informado!");

        const weekDay = scheduleItem.week_day;
        const from = convertHourToMinute(scheduleItem.from);
        const to = convertHourToMinute(scheduleItem.to);

        if (from > to) {
          throw "Horário inicial maior que o horário final!";
        }

        else if (to - from < 30) {
          throw "Necessário, no mínimo, disponibilidade de 30 minutos!";
        }

        return {
          week_day: weekDay,
          from,
          to,
          id_class,
        };
      });
  
      await transaction('class_schedules').insert(classSchedules);
  
      await transaction.commit();
  
      return response.status(201).send();

    } catch (err) {
      transaction.rollback();
  
      return response.status(400).json({
        error: err,
      });
    }
  }
}