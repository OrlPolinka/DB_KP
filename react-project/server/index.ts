import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import routes from './routes';
import { getPool } from './db';

getPool();


dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json({ limit: '30mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/', routes);
app.use('/images', express.static('C:/Users/user/Desktop/лк, экз/бд/3 курс/кп/DB_KP/images'));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
