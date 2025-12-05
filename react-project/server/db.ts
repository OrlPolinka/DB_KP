import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER || 'localhost',
  port: 1433,
  database: process.env.SQL_DATABASE,
  options: {
    trustServerCertificate: true,
    encrypt: (process.env.SQL_ENCRYPT || 'false') === 'true',
    // Настройка кодировки для правильной работы с кириллицей
    enableArithAbort: true,
    requestTimeout: 30000,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let poolPromise: Promise<sql.ConnectionPool>;

export const getPool = () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect()
    .then((pool: sql.ConnectionPool) => {
      console.log('MSSQL: подключено');
      return pool;
    })
    .catch((err: unknown) => {
      console.error('MSSQL ошибка подключения:', err);
      throw err; 
    });
  }
  return poolPromise;
};

export { sql };
