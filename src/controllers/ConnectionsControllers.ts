import { Request, Response } from 'express';

import db from '../database/connection';

export default class ConnectionsControllers {
  async create(request: Request, response: Response) {
    const { id_user } = request.body;

    await db('connections').insert({
      id_user
    });

    return response.status(201).send();
  }
}