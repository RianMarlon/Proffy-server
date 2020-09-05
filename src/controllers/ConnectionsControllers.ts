import { Request, Response } from 'express';

import db from '../database/connection';

export default class ConnectionsControllers {
  async getCount(request: Request, response: Response) {
    const totalConnections = await db('connections').count('* as total');

    const { total } = totalConnections[0];

    return response.json({ total });
  }

  async insert(request: Request, response: Response) {
    const { id_user } = request.body;

    try {
      await db('connections').insert({
        id_user
      });
  
      return response.status(201).send();
    }

    catch(err) {
      return response.status(400).send();
    }
  }
}
