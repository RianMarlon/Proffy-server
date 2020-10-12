import express from 'express';
import cors from 'cors';
import routes from './src/routes';

const app = express();

app.use(cors({
  origin: '*'
}));
app.use(express.json());
app.use(express.static('public'));
app.use(routes);

app.listen(process.env.PORT || 3333);
