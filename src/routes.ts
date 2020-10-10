import express from 'express';

import SubjectsControllers from './controllers/SubjectsControllers';
import UsersControllers from './controllers/UsersControllers';
import ClassesControllers from './controllers/ClassesControllers';
import FavoritesControllers from './controllers/FavoritesControllers';
import ConnectionsControllers from './controllers/ConnectionsControllers';

import authenticate from './middlewares/auth';
import AuthControllers from './controllers/AuthControllers';

import multerConfig from './middlewares/multer';

const routes = express.Router();
const subjectsControllers = new SubjectsControllers()
const classesControllers = new ClassesControllers();
const favoritesControllers = new FavoritesControllers();
const connectionsControllers = new ConnectionsControllers();
const usersControllers = new UsersControllers();
const authControllers = new AuthControllers();

routes.post('/signup', usersControllers.insert);
routes.post('/signin', authControllers.signin);
routes.post('/validate-token', authControllers.validateToken);

routes.post('/forgot-password', authControllers.forgotPassword);
routes.post('/change-password', authControllers.changePassword);

routes.all('/me', authenticate);
routes.get('/me', usersControllers.getUserByToken);
routes.put('/me', multerConfig.single('avatar'), authenticate, usersControllers.update);

routes.all('/classes', authenticate);
routes.get('/classes', classesControllers.getWithSchedules);
routes.post('/classes', classesControllers.insert);

routes.all('/favorites', authenticate);
routes.get('/favorites', favoritesControllers.getWithSchedules);
routes.post('/favorites', favoritesControllers.insertOrDelete);

routes.all('/connections', authenticate);
routes.get('/connections', connectionsControllers.getCount);
routes.post('/connections', connectionsControllers.insert);

routes.all('/subjects', authenticate);
routes.get('/subjects', subjectsControllers.getAll);

export default routes;
