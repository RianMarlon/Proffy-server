import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import {existOrError, notExistOrError, equalOrError, validEmailOrError} from '../utils/validate';
import db from '../database/connection';

export default class UsersControllers {

  static encryptPassword(password: string) {
    const saltRounds = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, saltRounds);
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