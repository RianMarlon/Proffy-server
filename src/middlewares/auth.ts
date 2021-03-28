import { Request, Response, NextFunction } from 'express';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import db from '../database/connection';

export default async function (request: Request, response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  try {
    if (!authHeader) {
      throw 'Acesso não autorizado!';
    }
  
    const [scheme, token] = authHeader.split(' ');
    const user: any = jwt.verify(token, process.env.AUTH_SECRET as string);
    
    db('users').where('id', '=', user.id)
      .first()
      .then((user) => {
        if (user) {
          request.body.id = user.id;
          return next();
        }

        else {
          return response.status(400).json({
            error: 'Usuário não encontrado!'
          });
        }
      })
      .catch((err) => response.status(500).json({
        error: err
      }));

  } catch (err) {
    return response.status(401).json({
      error: err
    });
  }
}