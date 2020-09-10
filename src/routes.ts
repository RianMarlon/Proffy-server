import express from 'express';
import ClassesControllers from './controllers/ClassesControllers';
import ConnectionsControllers from './controllers/ConnectionsControllers';

import authenticate from './middlewares/auth';

const routes = express.Router();
const classesControllers = new ClassesControllers();
const connectionsControllers = new ConnectionsControllers();

routes.all('/classes', authenticate);
routes.get('/classes', classesControllers.getWithSchedules);
routes.post('/classes', classesControllers.insert);

routes.all('/connections', authenticate);
routes.get('/connections', connectionsControllers.getCount);
routes.post('/connections', connectionsControllers.insert);

export default routes;
