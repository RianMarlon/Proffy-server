import { Request, Response } from 'express';

import db from '../database/connection';

export default class ConnectionsControllers {
  async getCount(request: Request, response: Response) {
    const totalConnections = await db('connections').count('* as total');

    const { total } = totalConnections[0];

    return response.json({ total });
  }

  async insert(request: Request, response: Response) {
    const { id, id_teacher } = request.body;
    
    try {
      if (id != id_teacher) {
        throw 'Não entre em contato com você mesmo, a conexão não será contada!'
      }

      await db('connections').insert({
        id_user: id,
        id_teacher
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
