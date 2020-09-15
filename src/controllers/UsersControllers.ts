import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';

import db from '../database/connection';
import {existOrError, notExistOrError, equalOrError, validEmailOrError} from '../utils/validate';
import convertMinutesToTime from '../utils/convertMinutesToTime';

interface UsersWithClass {
  first_name: string,
  last_name: string,
  avatar: string,
  email: string,
  subject: string,
  cost: number,
  whatsapp: string,
  biography: string,
  schedules: [{  
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
  week_day: number,
  from: number,
  to: number,
}

const { authSecret } = require('../../.env');

export default class UsersControllers {

  static encryptPassword(password: string) {
    const saltRounds = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, saltRounds);
  }

  static convertByIdToWithSchedules(user: UserItem[]) {
    const data: UsersWithClass = {
      subject: '',
      cost: 0,
      last_name: '',
      first_name: '',
      email: '',
      avatar: '',
      whatsapp: '',
      biography: '',
      schedules: [{
        week_day: 0,
        from: '',
        to: '',
      }],
    }
  
    user.forEach((userItem: UserItem, index: number) => {
      const schedule = {
        week_day: userItem.week_day,
        from: convertMinutesToTime(userItem.from),
        to: convertMinutesToTime(userItem.to),
      }
  
      if (index === 0) {
        data.subject = userItem.subject;
        data.cost = userItem.cost;
        data.first_name = userItem.first_name;
        data.last_name = userItem.last_name
        data.email = userItem.email;
        data.avatar = userItem.avatar;
        data.whatsapp = userItem.whatsapp;
        data.biography = userItem.biography;
        data.schedules = [{ ...schedule }];
      }
  
      else {
        data.schedules.push({ ...schedule });
      }
    });
  
    return { ...data };
  }

  async getUserByToken(request: Request, response: Response) {
    const authHeader = request.headers.authorization;

    try {
      if (!authHeader) {
        throw "Acesso não autorizado!";
      }
    
      const [scheme, token] = authHeader.split(" ");
      const user: any = await promisify(jwt.verify)(token, authSecret);

      const userWithClass = await db('users')
        .select(['users.*', 'classes.*', 'class_schedules.*'])
        .where('users.id', '=', user.id)
        .join('classes', 'classes.id_user', '=', user.id)
        .join('class_schedules', 'classes.id', '=', 'class_schedules.id_class')
        .orderBy(['classes.id', 'class_schedules.week_day', 'class_schedules.to']);
    
      const userWithSchedules = UsersControllers.convertByIdToWithSchedules(userWithClass);

      return response.json({
        user: {
          ...userWithSchedules
        }
      });

    } catch (err) {
      return response.status(200).json({
        error: err,
      });
    }
  }

  async insert(request: Request, response: Response) {
    const {
      first_name,
      last_name,
      email,
      password,
      confirm_password,
    } = request.body;

    try {
      existOrError(first_name, 'Nome não informado!');
      existOrError(last_name, 'Sobrenome não informado!');
      existOrError(email, 'E-mail não informado!');
      validEmailOrError(email, 'E-mail inválido!');
      existOrError(password, 'Senha não informada!');
      existOrError(confirm_password, 'Senha de confirmação não informada!');
      equalOrError(password, confirm_password, 'Senhas informadas não coincidem!');

      const userByEmail = await db('users')
        .select('id')
        .where('email', '=', email)
        .first();
      
      notExistOrError(userByEmail, 'E-mail informado já foi cadastrado!');
      
      const passwordEncrypted = UsersControllers.encryptPassword(password);
      
      db('users').insert({
        first_name,
        last_name,
        email,
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
}