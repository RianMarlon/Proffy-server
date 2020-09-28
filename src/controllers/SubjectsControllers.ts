import { Request, Response } from 'express';

import db from '../database/connection';

export default class SubjectsControllers {
  
  async getAll(request: Request, response: Response) {
    db('subjects')
      .select('*')
      .orderBy('subject')
      .then((data) => {
        return response.status(200).json({
          subjects: [ ...data ]
        });
      })
      .catch(() => {
        return response.status(500).json({
          error: 'Ocorreu um erro no servidor'
        });
      });
  }
}