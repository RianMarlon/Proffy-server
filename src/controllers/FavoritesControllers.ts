import { Request, Response } from 'express';

import db from '../database/connection';
import convertMinutesToTime from '../utils/convertMinutesToTime';
import convertNumberToWeekDay from '../utils/convertNumberToWeekDay';
import { ClassItem, ClassWithSchedules } from './ClassesControllers';
import URL_BACKEND from '../config/url';

export default class FavoritesControllers {
  
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
        data.is_favorite = true;
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

    const page = Number(filters.page as string) || 1;
    const perPage = Number(filters.per_page as string) || 1;

    const limit = perPage;
    const offset = perPage * (page - 1);

    const subselectClasses = `
        select classes.* from classes
        inner join subjects 
        on (classes.id_subject = subjects.id)
        inner join favorites
        on (classes.id = favorites.id_class)
        where favorites.id_user = ??
      `
    ;

    const queryAllClassesFavorites = db('classes')
      .join('subjects', 'classes.id_subject', '=', 'subjects.id')
      .join('users', 'classes.id_user', '=', 'users.id')
      .join('class_schedules', 'classes.id', '=', 'class_schedules.id_class')

    const classesByPage = await queryAllClassesFavorites
      .select([
        'users.*',
        'classes.*',
        'class_schedules.*',
        'class_schedules.id as id_class_schedule',
        'subjects.*',
      ])
      .from(db.raw(`(${subselectClasses} limit ?? offset ??) as classes`, [
        id, limit, offset
      ]))
      .orderBy([
        'class_schedules.week_day',
        'class_schedules.to'
      ]);

    const countFavorites = await db('favorites')
      .countDistinct('favorites.id_class')
      .where('favorites.id_user', '=', id);

    const quantityFavorites = countFavorites[0]['count'];

    const favoritesIds: number[] = [];
    const favoritesWithSchedules: ClassWithSchedules[] = [];

    classesByPage.forEach((classItem: ClassItem) => {
      if(!favoritesIds.includes(classItem.id_class)) {
        favoritesIds.push(classItem.id_class);
      }
    });

    favoritesIds.forEach((classId: number) => {
      const classesById = classesByPage.filter((classItem: ClassItem) => {
        return classId === classItem.id_class;
      });

      const classWithSchedules = FavoritesControllers.convertByIdToWithSchedules(classesById);

      favoritesWithSchedules.push({ ...classWithSchedules });
    });
    
    const favoritesWithSchedulesData = {
      favorites_by_page: [
       ...favoritesWithSchedules
      ],
      quantity_favorites: quantityFavorites,
    };

    return response.json(favoritesWithSchedulesData);
  }

  async insertOrDelete(request: Request, response: Response) {
    const { id, id_class: idClass } = request.body;

    const favoriteByIdUserAndClass = await db('favorites')
      .where('id_class', '=', idClass)
      .where('id_user', '=', id)
      .first();

    try {
      if(favoriteByIdUserAndClass) {
        await db('favorites')
          .delete()
          .where('id_class', '=', idClass)
          .where('id_user', '=', id);

        return response.status(201).json({
          it_was_inserted: false,
        });
      }

      await db('favorites').insert({
        id_user: id,
        id_class: idClass,
      });
  
      return response.status(201).json({
        it_was_inserted: true,
      });
    }

    catch(err) {
      return response.status(500).json({
        error: 'Erro no servidor!',
      });
    }
  }
}