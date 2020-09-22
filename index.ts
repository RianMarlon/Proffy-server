import express from 'express';
import cors from 'cors';
import routes from './src/routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(routes);

app.listen(3333);
