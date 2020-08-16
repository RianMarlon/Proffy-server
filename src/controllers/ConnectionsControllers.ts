import { Request, Response } from 'express';

import db from '../database/connection';

export default class ConnectionsControllers {
  async index(request: Request, response: Response) {
    const totalConnections = await db('connections').count('* as total');

    const { total } = totalConnections[0];

    return response.json({ total });
  }

  async create(request: Request, response: Response) {
    const { id_user } = request.body;

    await db('connections').insert({
      id_user
    });

    return response.status(201).send();
  }
}