import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { promisify } from 'util';

import { existOrError } from '../utils/validate';
import db from '../database/connection';
import emailService from '../modules/emailService';

const { email: sender } = require('../config/emailService.json');
const { authSecret } = require('../../.env');

export default class AuthControllers {
  
  async signin(request: Request, response: Response) {
    const { email, password } = request.body;
    
    try {
      existOrError(email, 'E-mail não informado!');
      existOrError(password, 'Senha não informada!');
      
      const userByEmail = await db('users')
        .where('email', '=', email)
        .first();

      existOrError(userByEmail, 'Usuário não cadastrado!');

      const isMatch = await bcrypt.compareSync(password, userByEmail.password);

      existOrError(isMatch, 'E-mail ou senha inválidos!');

      const payload = {
        id: userByEmail.id,
      }

      const token = jwt.sign({ ...payload }, authSecret, {
        expiresIn: '7d',
      });
      
      return response.status(200).json({
        token,
      });
    }
    
    catch(err) {
      return response.status(400).json({
        error: err,
      });
    }
  }

  async validateToken(request: Request, response: Response) {
    const { token } = request.body;

    try {
      existOrError(token, 'Token não informado!');

      const user: any = await promisify(jwt.verify)(token, authSecret);

      existOrError(user, 'Token inválido!');
      
      db('users')
        .select('id')
        .where('id', '=', user.id)
        .first()
        .then((user) => response.status(200).json({
          isTokenValid: !!user,
        }))
        .catch((err) => response.status(500).json({
          error: err,
        }));

    } catch (err) {
      return response.status(200).json({
        isTokenValid: false,
      });
    }
  }

  async forgotPassword(request: Request, response: Response) {
    const { email } = request.body;

    try {
      const userByEmail = await db('users')
        .select('users.id')
        .where('email', '=', email)
        .first();

      existOrError(userByEmail, 'Não existe usuário com o e-mail informado!');

      const payload = {
        id: userByEmail.id
      }

      const token = jwt.sign({ ...payload }, authSecret, {
        expiresIn: '30m',
      });

      emailService.sendMail({
        to: email as string,
        from: sender,
        template: 'auth/forgotPassword',
        context: { token },
      }, (err: any) => {
        if (err) {
          return response.status(500).json({
            error: 'Não foi possível enviar o e-mail!'
          });
        }

        return response.status(200).send();
      });

    } catch(err) {
      response.status(400).json({
        error: err,
      });
    }
  }
}