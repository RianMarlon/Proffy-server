import { Request, Response } from 'express';

import db from '../database/connection';
import { notExistOrError } from '../utils/validate';

export default class ConnectionsControllers {
  async getCount(request: Request, response: Response) {
    const totalConnections = await db('connections').count('* as total');

    const { total } = totalConnections[0];

    return response.json({ total });
  }

  async insert(request: Request, response: Response) {
    const { id, id_class: idClass } = request.body;

    const classByIdUser = await db('classes')
      .where('id', '=', idClass)
      .where('id_user', '=', id)
      .first();

    const connectionByUserAndClass = await db('connections')
      .where('id_user', '=', id)
      .where('id_class', '=', idClass)
      .first();
    
    try {
      notExistOrError(classByIdUser, 
        'Não entre em contato com você mesmo, a conexão não será contada!');

      if (connectionByUserAndClass) {
        return;
      }

      await db('connections').insert({
        id_user: id,
        id_class: idClass,
      });
  
      return response.status(201).send();
    }

    catch(err) {
      return response.status(400).json({
        error: err
      });
    }
  }
}
