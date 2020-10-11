import { Request, Response } from 'express';
import bcrypt from 'bcrypt';

import path from 'path';
import fs from 'fs';

import db from '../database/connection';

import {existOrError, notExistOrError, equalOrError, validEmailOrError} from '../utils/validate';
import convertMinutesToTime from '../utils/convertMinutesToTime';
import convertHourToMinute from '../utils/convertHourToMinute';
import convertEmailToUrlGravatar from '../utils/convertEmailToUrlGravatar';
import compressImage from '../utils/compressImage';

interface UsersWithClass {
  first_name: string,
  last_name: string,
  avatar: string,
  email: string,
  subject: string,
  cost: number,
  whatsapp: string,
  biography: string,
  id_class: number,
  schedules: [{
    id_class_schedule: number,
    week_day: number,
    from: string,
    to: string,
  }],
}

export interface UserItem {
  first_name: string,
  last_name: string,
  email: string,
  avatar: string,
  subject: string,
  cost: number,
  whatsapp: string,
  biography: string,
  id_class: number,
  id_class_schedule: number,
  week_day: number,
  from: number,
  to: number,
}

interface ScheduleItem {
  week_day: number,
  from: string,
  to: string,
}

export default class UsersControllers {

  static encryptPassword(password: string) {
    const saltRounds = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, saltRounds);
  }

  static removeImage(destination: string, url: string) {
    const urlSplitted = url.split('/');
    
    const filename = urlSplitted.pop();

    if (filename) {
      const filePath = path.resolve(destination, filename);
      fs.unlink(filePath, err => {
        if(err) console.log(err);
      });
    }
  }

  static convertByIdToWithSchedules(user: UserItem[]) {
    const data: UsersWithClass = {} as UsersWithClass;
  
    user.forEach((userItem: UserItem, index: number) => {
      const schedule = {
        id_class_schedule: userItem.id_class_schedule,
        week_day: userItem.week_day,
        from: convertMinutesToTime(userItem.from),
        to: convertMinutesToTime(userItem.to),
      }
  
      if (index === 0) {
        data.subject = userItem.subject;
        data.cost = userItem.cost;
        data.first_name = userItem.first_name;
        data.last_name = userItem.last_name;
        data.email = userItem.email;
        data.avatar = userItem.avatar;
        data.whatsapp = userItem.whatsapp;
        data.biography = userItem.biography;
        data.id_class = userItem.id_class;
        data.schedules = [{ ...schedule }];
      }
  
      else {
        data.schedules.push({ ...schedule });
      }
    });
  
    return { ...data };
  }

  async getUserByToken(request: Request, response: Response) {
    const { id: idUser } = request.body;

    try {
      const classByIdUser = await db('classes')
        .where('id_user', '=', idUser)
        .first();

      if (classByIdUser) {
        const userWithClass = await db('users')
          .select([
            'users.*',
            'classes.*',
            'class_schedules.*',
            'class_schedules.id as id_class_schedule',
            'subjects.*'
          ])
          .join('classes', 'classes.id_user', '=', 'users.id')
          .join('subjects', 'classes.id_subject', '=', 'subjects.id')
          .join('class_schedules', 'classes.id', '=', 'class_schedules.id_class')
          .where('users.id', '=', idUser)
          .orderBy(['classes.id', 'class_schedules.week_day', 'class_schedules.to']);

        const userWithSchedules = UsersControllers.convertByIdToWithSchedules(userWithClass);

        return response.json({
          user: {
            ...userWithSchedules,
            isTeacher: true
          }
        });
      }

      else {
        const userData = {
          first_name: '',
          last_name: '',
          avatar: '',
          email: '',
          subject: '',
          cost: '',
          whatsapp: '',
          biography: '',
          schedules: [],
        }

        const user = await db('users')
          .select('*')
          .where('id', '=', idUser)
          .first();

        userData.first_name = user.first_name;
        userData.last_name = user.last_name
        userData.email = user.email;
        userData.avatar = user.avatar;

        return response.json({
          user: {
            ...userData,
            isTeacher: false
          }
        });
      }

    } catch (err) {
      return response.status(200).json({
        error: err,
      });
    }
  }

  async insert(request: Request, response: Response) {
    const {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      confirm_password: confirmPassword,
    } = request.body;

    try {
      existOrError(firstName, 'Nome não informado!');
      existOrError(lastName, 'Sobrenome não informado!');
      existOrError(email, 'E-mail não informado!');
      validEmailOrError(email, 'E-mail inválido!');
      existOrError(password, 'Senha não informada!');
      existOrError(confirmPassword, 'Senha de confirmação não informada!');
      equalOrError(password, confirmPassword, 'Senhas informadas não coincidem!');

      if (password.length < 6) {
        throw 'Senha deve conter, no mínimo, 6 caracteres!';
      }

      const userByEmail = await db('users')
        .select('id')
        .where('email', '=', email)
        .first();
      
      notExistOrError(userByEmail, 'E-mail informado já foi cadastrado!');

      const urlGravatar = convertEmailToUrlGravatar(email);
      
      const passwordEncrypted = UsersControllers.encryptPassword(password);
      
      db('users').insert({
        first_name: firstName,
        last_name: lastName,
        email,
        avatar: urlGravatar,
        password: passwordEncrypted,
      })
      .then(() => response.status(201).send())
      .catch((err) => response.status(500).send(err));
    }
    
    catch(err) {
      response.status(400).json({
        error: err,
      });
    }
  }

  async update(request: Request, response: Response) {
    const {
      id: idUser,
      biography,
      whatsapp,
      cost,
      schedules,
    } = request.body;

    if (request.file) {
      const { avatar: oldUrlAvatar } = await db('users')
        .select('avatar')
        .where('id', '=', idUser)
        .first()
        .catch((err) => console.log(err));

      if (oldUrlAvatar && !oldUrlAvatar.includes('gravatar.com')) {
        UsersControllers.removeImage(request.file.destination, oldUrlAvatar);
      }

      const { url } = await compressImage(request.file, 250);

      return await db('users').update({
          avatar: url,
        })
        .where('id', '=', idUser)
        .then(() => response.status(201).send())
        .catch(() => {
          return response.status(400).json({
            error: 'Erro ao fazer upload da imagem!',
          });
        });
    }

    const classByIdUser = await db('classes')
      .where('id_user', '=', idUser)
      .first();

    const transaction = await db.transaction();

    try {
      existOrError(classByIdUser, 'Você não é professor, pode substituir apenas a foto!');
      existOrError(biography, 'Biografia não informada!');
      existOrError(whatsapp, 'Whatsapp não informado!');
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

      await transaction('classes').update({
          cost: newCost.toFixed(2),
        })
        .where('id_user', '=', classByIdUser.id);

      await transaction('class_schedules')
        .delete()
        .where('id_class', '=', classByIdUser.id);
  
      const classSchedules = schedules.map((scheduleItem: ScheduleItem) => {
        if(scheduleItem.week_day < 0 || scheduleItem.week_day > 6) {
          throw 'Dia da semana não informado!';
        }

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
          id_class: classByIdUser.id,
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