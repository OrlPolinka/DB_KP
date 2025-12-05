import { Router } from 'express';
import { getPool, sql } from './db';
import { requireAuth, signToken } from './auth';

const r = Router();

/* -------------------- AUTH -------------------- */
r.post('/auth/register', async (req, res) => {
  const { username, passwordHash, email } = req.body;
  const pool = await getPool();

  await pool.request()
    .input('Username', sql.NVarChar(100), username)
    .input('PasswordHash', sql.NVarChar(250), passwordHash)
    .input('Email', sql.NVarChar(100), email)
    .execute('RegisterUser');

  const resp = await pool.request()
    .input('Username', sql.NVarChar(100), username)
    .input('PasswordHash', sql.NVarChar(250), passwordHash)
    .execute('LoginUser');

  const user = resp.recordset?.[0];
  res.json({ token: signToken(user), user });
});

r.post('/auth/login', async (req, res) => {
  const { username, passwordHash } = req.body;
  const pool = await getPool();

  const resp = await pool.request()
    .input('Username', sql.NVarChar(100), username)
    .input('PasswordHash', sql.NVarChar(250), passwordHash)
    .execute('LoginUser');

  const user = resp.recordset?.[0];
  if (!user) return res.status(401).json({ error: 'Неверные данные' });
  res.json({ token: signToken(user), user });
});

r.post('/auth/delete-own', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { passwordHash } = req.body;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .input('PasswordHash', sql.NVarChar(250), passwordHash ?? null)
    .execute('DeleteAccount');
  res.json({ ok: true });
});

/* -------------------- PRODUCTS -------------------- */
r.get('/products', async (_, res) => {
  const pool = await getPool();
  const resp = await pool.request().execute('GetProducts');
  res.json(resp.recordset);
});

r.get('/products/paged', async (req, res) => {
  const pool = await getPool();
  const page = Number(req.query.page ?? 1);
  const size = Number(req.query.size ?? 50);
  const resp = await pool.request()
    .input('PageNumber', sql.Int, page)
    .input('PageSize', sql.Int, size)
    .execute('GetProductsPaged');
  res.json(resp.recordset);
});


r.get('/products/top100', async (_, res) => {
  const pool = await getPool();
  const resp = await pool.request().execute('GetTop100Products');
  res.json(resp.recordset);
});

r.get('/products/:id', async (req, res) => {
  const pool = await getPool();
  const resp = await pool.request()
    .input('ProductID', sql.Int, Number(req.params.id))
    .execute('GetProductDetails');
  const row = resp.recordset?.[0];
  if (!row) return res.status(404).json({ error: 'Товар не найден' });
  res.json(row);
});

r.get('/products/search', async (req, res) => {
  const pool = await getPool();
  const resp = await pool.request()
    .input('Keyword', sql.NVarChar(sql.MAX), String(req.query.q || ''))
    .execute('SearchProducts');
  res.json(resp.recordset);
});

r.get('/products/by-category', async (req, res) => {
  const pool = await getPool();
  const { categoryId, categoryName } = req.query;
  if (categoryId) {
    const resp = await pool.request()
      .input('CategoryID', sql.Int, Number(categoryId))
      .execute('FilterSearchProducts');
    return res.json(resp.recordset);
  }
  if (categoryName) {
    const resp = await pool.request()
      .input('CategoryName', sql.NVarChar(200), String(categoryName))
      .execute('FilterSearchProducts');
    return res.json(resp.recordset);
  }
  res.json([]);
});

/* -------------------- CATEGORIES -------------------- */
r.get('/categories', async (_, res) => {
  const pool = await getPool();
  const resp = await pool.request().execute('GetCategories');
  res.json(resp.recordset);
});

/* -------------------- FAVORITES -------------------- */
r.post('/favorites', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { productId } = req.body;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .input('ProductID', sql.Int, productId)
    .execute('AddToFavorites');
  res.json({ ok: true });
});

r.get('/favorites', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();
  const resp = await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .execute('GetFavorites');
  res.json(resp.recordset);
});

r.delete('/favorites/by-product/:productId', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .input('ProductID', sql.Int, Number(req.params.productId))
    .execute('DeleteFromFavorites');
  res.json({ ok: true });
});

/* -------------------- CART -------------------- */
r.get('/cart', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();
  const resp = await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .execute('GetCartItems');
  res.json(resp.recordset);
});

r.post('/cart/add', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { productId, quantity } = req.body;
  const pool = await getPool();
  const resp = await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .input('ProductID', sql.Int, productId)
    .input('QuantityDelta', sql.Int, quantity ?? 1)
    .execute('UpsertCartItem');
  res.json(resp.recordset?.[0] ?? { ok: true });
});

r.post('/cart/set', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { productId, quantity } = req.body;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .input('ProductID', sql.Int, productId)
    .input('Quantity', sql.Int, quantity)
    .execute('SetCartItemQuantity');
  res.json({ ok: true });
});

r.delete('/cart/:productId', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .input('ProductID', sql.Int, Number(req.params.productId))
    .execute('DeleteFromCart');
  res.json({ ok: true });
});

/* -------------------- ORDERS -------------------- */
r.post('/orders/create', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { promoCode } = req.body;
  const pool = await getPool();

  let promoId: number | null = null;
  if (promoCode) {
    const pr = await pool.request()
      .input('Code', sql.NVarChar(100), promoCode)
      .execute('GetPromoIdByCode');
    promoId = pr.recordset?.[0]?.PromoID ?? null;
  }

  await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .input('PromoID', sql.Int, promoId)
    .execute('CreateOrder');

  res.json({ ok: true });
});

r.get('/orders', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();
  const resp = await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .execute('GetUserOrders');
  res.json(resp.recordset);
});

r.get('/orders/:orderId', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();
  const resp = await pool.request()
    .input('UserID', sql.Int, user.UserID)
    .input('OrderID', sql.Int, Number(req.params.orderId))
    .execute('GetOrderDetails');
  res.json(resp.recordset);
});

/* -------------------- ADMIN: PRODUCTS -------------------- */
r.post('/admin/products/add', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { productName, description, categoryId, price, stockQuantity, imageUrl } = req.body;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, admin.UserID)
    .input('ProductName', sql.NVarChar(100), productName)
    .input('Description', sql.NVarChar(sql.MAX), description)
    .input('CategoryID', sql.Int, categoryId)
    .input('Price', sql.Decimal(10, 2), price)
    .input('StockQuantity', sql.Int, stockQuantity)
    .input('ImageURL', sql.NVarChar(500), imageUrl ?? null)
    .execute('AddProduct');
  res.json({ ok: true });
});

r.post('/admin/products/update', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { productId, productName, description, categoryId, price, stockQuantity, imageUrl } = req.body;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, admin.UserID)
    .input('ProductID', sql.Int, productId)
    .input('ProductName', sql.NVarChar(100), productName)
    .input('Description', sql.NVarChar(sql.MAX), description)
    .input('CategoryID', sql.Int, categoryId)
    .input('Price', sql.Decimal(10, 2), price)
    .input('StockQuantity', sql.Int, stockQuantity)
    .input('ImageURL', sql.NVarChar(500), imageUrl ?? null)
    .execute('UpdateProduct');
  res.json({ ok: true });
});

r.post('/admin/products/delete', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { productId } = req.body;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, admin.UserID)
    .input('ProductID', sql.Int, productId)
    .execute('DeleteProduct');
  res.json({ ok: true });
});

/* -------------------- ADMIN: PROMOCODES -------------------- */
r.get('/admin/promocodes', async (_, res) => {
  const pool = await getPool();
  const resp = await pool.request().execute('GetPromocodes');
  res.json(resp.recordset);
});

r.post('/admin/promocodes/add', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { code, discountPercent, isGlobal, categoryId, validFrom, validTo } = req.body;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, admin.UserID)
    .input('Code', sql.NVarChar(100), code)
    .input('DiscountPercent', sql.Int, discountPercent)
    .input('IsGlobal', sql.Bit, isGlobal)
    .input('CategoryID', sql.Int, categoryId ?? null)
    .input('ValidFrom', sql.DateTime, validFrom ? new Date(validFrom) : null)
    .input('ValidTo', sql.DateTime, validTo ? new Date(validTo) : null)
    .execute('AddPromocode');
  res.json({ ok: true });
});

r.post('/admin/promocodes/delete', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { promoId } = req.body;
  const pool = await getPool();
  await pool.request()
    .input('UserID', sql.Int, admin.UserID)
    .input('PromoID', sql.Int, promoId)
    .execute('DeletePromocode');
  res.json({ ok: true });
});

/* -------------------- LOGS -------------------- */
r.get('/admin/logs', async (req, res) => {
  const pool = await getPool();
  const userId = Number(req.query.userId); // передаём ID админа
  const resp = await pool.request()
    .input('UserID', sql.Int, userId)
    .execute('GetLogs');
  res.json(resp.recordset);
});

r.get('/admin/logs/export', async (_, res) => {
  const pool = await getPool();
  const resp = await pool.request().execute('ExportLogsToJSON');
  // процедура возвращает JSON строкой
  const data = resp.recordset;
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    const json = Object.values(first)[0];
    return res.type('application/json').send(json);
  }
  res.json(data);
});

r.post('/admin/logs/import', async (req, res) => {
  const pool = await getPool();
  try {
    // Принимаем JSON из тела запроса
    const jsonData = req.body;
    if (!jsonData || !Array.isArray(jsonData)) {
      return res.status(400).json({ error: 'Неверный формат данных. Ожидается массив логов.' });
    }
    
    // Преобразуем массив в JSON строку для передачи в процедуру
    const jsonString = JSON.stringify(jsonData);
    
    // Вызываем процедуру с JSON параметром
    await pool.request()
      .input('JsonData', sql.NVarChar(sql.MAX), jsonString)
      .execute('ImportLogsFromJSON');
    
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Ошибка импорта:', err);
    res.status(500).json({ error: err.message || 'Ошибка импорта логов' });
  }
});

r.delete('/admin/logs', async (req, res) => {
  const pool = await getPool();
  const userId = Number(req.query.userId);
  await pool.request()
    .input('UserID', sql.Int, userId)
    .execute('DeleteLogs');
  res.json({ ok: true });
});

export default r;
