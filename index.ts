import express from 'express';
import cors from 'cors';
import path from 'path';

import routes from './src/routes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/files', express.static(path.resolve(__dirname, 'public', 'files')));
app.use(routes);

app.listen(process.env.PORT || 3333);
