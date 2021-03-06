import { Request, Response } from 'express';

import db from '../database/connection';
import convertHourToMinute from '../utils/convertHourToMinute';
import convertMinutesToTime from '../utils/convertMinutesToTime';
import convertNumberToWeekDay from '../utils/convertNumberToWeekDay';
import { existOrError, notExistOrError } from '../utils/validate';
import URL_BACKEND from '../config/url';

export interface ClassItem {
  id_class: number,
  subject: string,
  cost: number,
  id_user: number,
  first_name: string,
  last_name: string,
  email: string,
  avatar: string,
  whatsapp: string,
  biography: string,
  id_class_schedule: number,
  week_day: number,
  from: number,
  to: number,
  id_favorite: boolean,
}

export interface ClassWithSchedules {
  id_class: number,
  subject: string,
  cost: number,
  last_name: string,
  first_name: string,
  avatar: string,
  email: string,
  whatsapp: string,
  biography: string,
  schedules: [{  
    id_class_schedule: number,
    week_day: string,
    from: string,
    to: string,
  }],
  is_favorite: boolean,
}

export interface ScheduleItem {
  id_class_schedule: number,
  week_day: number,
  from: string,
  to: string,
}

export default class ClassesController {
  
  static convertByIdToWithSchedules(classes: ClassItem[]) {
    const data: ClassWithSchedules = {} as ClassWithSchedules;
  
    classes.forEach((classItem: ClassItem, index: number) => {
      const schedule = {
        id_class_schedule: classItem.id_class_schedule,
        week_day: convertNumberToWeekDay(classItem.week_day),
        from: convertMinutesToTime(classItem.from),
        to: convertMinutesToTime(classItem.to),
      }
  
      if (index === 0) {
        data.id_class = classItem.id_class;
        data.subject = classItem.subject;
        data.cost = classItem.cost;
        data.first_name = classItem.first_name;
        data.last_name = classItem.last_name
        data.email = classItem.email;
        data.avatar = !classItem.avatar.includes('gravatar.com') 
          ? `${URL_BACKEND}/files/${classItem.avatar}`
          :  classItem.avatar;
        data.whatsapp = classItem.whatsapp;
        data.biography = classItem.biography;
        data.schedules = [{ ...schedule }];
        data.is_favorite = typeof classItem.id_favorite == 'number' ? true : false;
      }
  
      else {
        data.schedules.push({ ...schedule });
      }
    });
  
    return { ...data };
  }

  async getWithSchedules(request: Request, response: Response) {
    const { id } = request.body;
    const filters = request.query;

    const idSubject = filters.id_subject as string;
    const week_day = filters.week_day as string;
    const time = filters.time as string;
    
    const page = Number(filters.page as string) || 1;
    const perPage = Number(filters.per_page as string) || 1;

    const timeInMinutes = convertHourToMinute(time);

    const limit = perPage;
    const offset = perPage * (page - 1);

    const subjectById = idSubject && await db('subjects')
      .where('id', '=', idSubject)
      .first();

    const whereClassByIdSubject = idSubject && await db('classes')
      .select('classes.*')
      .join('subjects', 'classes.id_subject', 'subjects.id')
      .where('subjects.id', '=', idSubject)
      .toString();
      
    const subselectClasses = subjectById
      ? whereClassByIdSubject
      : `
        select classes.* from classes
        inner join subjects 
        on (classes.id_subject = subjects.id)
      `
    ;

    const queryAllClasses = db('classes')
      .whereExists(function() {
        this.select('class_schedules.*')
          .from('class_schedules')
          .whereRaw('class_schedules.id_class = classes.id');

        if (week_day) {
          this.whereRaw('class_schedules.week_day = ??', [Number(week_day)]);
        }

        if (timeInMinutes) {
          this.whereRaw('class_schedules.from <= ??', [timeInMinutes]);
          this.whereRaw('class_schedules.to > ??', [timeInMinutes]);
        }
      })
      .join('subjects', 'classes.id_subject', '=', 'subjects.id')
      .join('users', 'classes.id_user', '=', 'users.id')
      .join('class_schedules', 'classes.id', '=', 'class_schedules.id_class')
      .joinRaw(`
        left join favorites 
        on favorites.id_class = classes.id AND favorites.id_user = ??
      `, [Number(id)]);

    const classesByPage = await queryAllClasses
      .select([
        'users.*',
        'classes.*',
        'class_schedules.*',
        'subjects.*',
        'favorites.id_class as id_favorite',
      ])
      .from(db.raw(`(${subselectClasses} limit ?? offset ??) as classes`, [
        limit, offset
      ]))
      .orderBy([
        'class_schedules.week_day',
        'class_schedules.to'
      ]);

    const countTeachersAndClasses = await db('classes')
      .countDistinct('classes.id_user');
      
    const quantityTeachers = countTeachersAndClasses[0]['count'];

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
      classes_by_page: [
       ...classesWithSchedules
      ],
      quantity_teachers: quantityTeachers,
    };

    return response.json(classesWithSchedulesData);
  }

  async insert(request: Request, response: Response) {
    const {
      id: idUser,
      biography,
      whatsapp,
      id_subject: idSubject,
      cost,
      schedules,
    } = request.body;

    const classByIdUser = await db('classes')
      .where('id_user', '=', idUser)
      .first();

    const subjectById = await db('subjects')
      .where('id', '=', idSubject)
      .first();
  
    const transaction = await db.transaction();

    try {
      notExistOrError(classByIdUser, 'Usuário já possui aula cadastrada!');
      existOrError(biography, 'Biografia não informada!');
      existOrError(whatsapp, 'Whatsapp não informado!');
      existOrError(idSubject, 'Matéria não informada!');
      existOrError(subjectById, 'Matéria inválida!');
      existOrError(cost, 'Preço não informado!');
      existOrError(schedules, 'Horário(s) não informado(s)!');
      
      if (biography.length > 500) {
        throw 'Biografia tem mais de 500 caracteres!';
      }
      
      await transaction('users').update({
          biography,
          whatsapp,
        })
        .where('id', '=', idUser);

      const newCost = Number(cost.replace(',', '.'));
        
      const insertedClassesIds = await transaction('classes').insert({
        id_user: idUser,
        id_subject: idSubject,
        cost: newCost.toFixed(2),
      }).returning('id');
  
      const idClass = insertedClassesIds[0];
  
      const classSchedules = schedules.map((scheduleItem: ScheduleItem) => {
        existOrError(scheduleItem.week_day, 'Dia da semana não informado!');
        existOrError(scheduleItem.from, 'Horário inicial não informado!');
        existOrError(scheduleItem.to, 'Horário final não informado!');

        const weekDay = scheduleItem.week_day;
        const from = convertHourToMinute(scheduleItem.from);
        const to = convertHourToMinute(scheduleItem.to);

        if (from > to) {
          throw 'Horário inicial maior que o horário final!';
        }

        else if (to - from < 60) {
          throw 'Necessário, no mínimo, disponibilidade de 1 hora!';
        }
 
        const hasEqualWeekDayAndFromBetweenSchedules = (scheduleItem: ScheduleItem) => {
          const scheduleWeekDay = scheduleItem.week_day;
          const scheduleFrom = convertHourToMinute(scheduleItem.from);
          const scheduleTo = convertHourToMinute(scheduleItem.to);

          return scheduleWeekDay == weekDay && 
            (from >= scheduleFrom && from <= scheduleTo );
        }

        const hasEqualWeekDayAndToBetweenSchedules = (scheduleItem: ScheduleItem) => {
          const scheduleWeekDay = scheduleItem.week_day;
          const scheduleFrom = convertHourToMinute(scheduleItem.from);
          const scheduleTo = convertHourToMinute(scheduleItem.to);

          return scheduleWeekDay == weekDay && 
            (to >= scheduleFrom && to <= scheduleTo );
        }

        const schedulesByFrom = schedules.filter(hasEqualWeekDayAndToBetweenSchedules);
        const schedulesByTo = schedules.filter(hasEqualWeekDayAndFromBetweenSchedules);

        if (schedulesByFrom.length > 1) {
          throw 'Aula com horário inicial entre o andamento de outra aula!';
        }

        else if (schedulesByTo.length > 1) {
          throw 'Aula com horário final entre o andamento de outra aula!';
        }

        return {
          week_day: weekDay,
          from,
          to,
          id_class: idClass,
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