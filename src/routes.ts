import express from 'express';
import ClassesControllers from './controllers/ClassesControllers';
import ConnectionsControllers from './controllers/ConnectionsControllers';

const routes = express.Router();
const classesControllers = new ClassesControllers();
const connectionsControllers = new ConnectionsControllers();

routes.get('/classes', classesControllers.getWithSchedules);
routes.post('/classes', classesControllers.insert);

routes.get('/connections', connectionsControllers.getCount);
routes.post('/connections', connectionsControllers.insert);

export default routes;
