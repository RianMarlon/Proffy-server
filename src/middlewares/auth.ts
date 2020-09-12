import { Request, Response, NextFunction } from 'express';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import db from '../database/connection';

const { authSecret } = require('../../.env');

export default async function (request: Request, response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  try {
    if (!authHeader) {
      throw "Acesso não autorizado!";
    }
  
    const [scheme, token] = authHeader.split(" ");
    const user: any = await promisify(jwt.verify)(token, authSecret);
    
    db('users').where("id", "=", user.id)
      .first()
      .then((user) => {
        if (user) {
          return next();
        }

        else {
          return response.status(400).json({
            error: "Usuário não encontrado!"
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