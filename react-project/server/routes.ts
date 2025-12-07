import { Router } from 'express';
import { getPool, sql } from './db';
import { requireAuth, requireRole, signToken } from './auth';

const r = Router();

/* -------------------- Helpers -------------------- */
async function execProc<T = any>(
  pool: any,
  procName: string,
  inputs: Array<{ name: string; type: any; value: any }>
): Promise<{ recordset: T[] }> {
  const req = pool.request();
  for (const inp of inputs) {
    req.input(inp.name, inp.type, inp.value);
  }
  try {
    // Всегда вызываем с явной схемой
    const resp = await req.execute(`dbo.${procName}`);
    return { recordset: resp.recordset || [] };
  } catch (err: any) {
    const info = err?.originalError?.info;
    console.error(`Ошибка в процедуре ${procName}:`, {
      message: err?.message,
      info,
      number: info?.number,
      state: info?.state,
      class: info?.class,
      procName: info?.procName,
      lineNumber: info?.lineNumber
    });
    throw err;
  }
}

function toInt(value: any, fallback?: number): number {
  if (value === null || value === undefined || value === '') {
    return fallback !== undefined ? fallback : NaN;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : (fallback !== undefined ? fallback : NaN);
}

/* -------------------- AUTH -------------------- */
r.post('/auth/register', async (req, res) => {
  const { username, passwordHash, email } = req.body;
  const pool = await getPool();

  await execProc(pool, 'RegisterUser', [
    { name: 'Username', type: sql.NVarChar(100), value: username },
    { name: 'PasswordHash', type: sql.NVarChar(250), value: passwordHash },
    { name: 'Email', type: sql.NVarChar(100), value: email }
  ]);

  const { recordset: users } = await execProc(pool, 'LoginUser', [
    { name: 'Username', type: sql.NVarChar(100), value: username },
    { name: 'PasswordHash', type: sql.NVarChar(250), value: passwordHash }
  ]);

  if (!users || users.length === 0) return res.status(401).json({ error: 'Ошибка регистрации' });
  const user = users.find((u: any) => u.RoleName === 'Admin') || users[0];
  res.json({ token: signToken(user), user });
});

r.post('/auth/login', async (req, res) => {
  const { username, passwordHash } = req.body;
  const pool = await getPool();

  const { recordset: users } = await execProc(pool, 'LoginUser', [
    { name: 'Username', type: sql.NVarChar(100), value: username },
    { name: 'PasswordHash', type: sql.NVarChar(250), value: passwordHash }
  ]);

  if (!users || users.length === 0) return res.status(401).json({ error: 'Неверные данные' });
  const user = users.find((u: any) => u.RoleName === 'Admin') || users[0];
  res.json({ token: signToken(user), user });
});

r.post('/auth/delete-own', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { passwordHash } = req.body;
  const pool = await getPool();

  try {
    await execProc(pool, 'DeleteAccount', [
      { name: 'UserID', type: sql.Int, value: toInt(user.UserID) },
      { name: 'PasswordHash', type: sql.NVarChar(250), value: passwordHash ?? null }
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    const errorMsg = err?.originalError?.info?.message || err.message || 'Ошибка удаления аккаунта';
    console.error('Ошибка удаления аккаунта:', errorMsg);
    res.status(400).json({ error: errorMsg });
  }
});

/* -------------------- PRODUCTS -------------------- */
r.get('/products', async (_, res) => {
  const pool = await getPool();
  const { recordset } = await execProc(pool, 'GetProducts', []);
  res.json(recordset);
});

r.get('/products/paged', async (req, res) => {
  const pool = await getPool();
  const page = toInt(req.query.page, 1);
  const size = toInt(req.query.size, 52);

  const { recordset } = await execProc(pool, 'GetProductsPaged', [
    { name: 'PageNumber', type: sql.Int, value: page },
    { name: 'PageSize', type: sql.Int, value: size }
  ]);

  res.json(recordset);
});

r.get('/products/top100', async (_, res) => {
  const pool = await getPool();
  // Если твоё представление возвращает полный набор — можно вернуть его напрямую.
  const { recordset: topProducts } = await execProc(pool, 'GetTop100Products', []);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(Array.isArray(topProducts) ? topProducts : []);
});

r.get('/products/search', async (req, res) => {
  const pool = await getPool();
  const keyword = String(req.query.q || '').trim();
  if (!keyword) return res.json([]);

  try {
    const { recordset } = await execProc(pool, 'SearchProducts', [
      { name: 'Keyword', type: sql.NVarChar(sql.MAX), value: keyword }
    ]);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(Array.isArray(recordset) ? recordset : []);
  } catch (_err) {
    // Возвращаем пустой массив, чтобы фронт не падал
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json([]);
  }
});

r.get('/products/search-paged', async (req, res) => {
  const pool = await getPool();
  const page = toInt(req.query.page, 1);
  const size = toInt(req.query.size, 52);
  const keyword = String(req.query.q || '').trim();

  if (!keyword) return res.json([]);

  try {
    const { recordset: all } = await execProc(pool, 'SearchProducts', [
      { name: 'Keyword', type: sql.NVarChar(sql.MAX), value: keyword }
    ]);

    if (!Array.isArray(all)) return res.json([]);

    const start = (page - 1) * size;
    const end = start + size;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(all.slice(start, end));
  } catch (_err) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json([]);
  }
});

r.get('/products/by-category-paged', async (req, res) => {
  const pool = await getPool();
  const { categoryId, page, size } = req.query;
  const pageNum = toInt(page, 1);
  const pageSize = toInt(size, 52);

  if (!categoryId) {
    return res.json([]);
  }

  const categoryIdNum = Number(String(categoryId).trim());
  if (!Number.isFinite(categoryIdNum) || categoryIdNum <= 0) {
    return res.json([]);
  }

  try {
    const { recordset: all } = await execProc(pool, 'FilterSearchProducts', [
      { name: 'CategoryID', type: sql.Int, value: categoryIdNum }
    ]);

    const products = Array.isArray(all) ? all : [];
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(products.slice(start, end));
  } catch (err: any) {
    console.error('Ошибка фильтрации по категории:', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json([]);
  }
});

// Параметризованный маршрут должен быть ПОСЛЕ всех специфичных маршрутов
r.get('/products/:id', async (req, res) => {
  const pool = await getPool();
  const productId = toInt(req.params.id);
  const { recordset } = await execProc(pool, 'GetProductDetails', [
    { name: 'ProductID', type: sql.Int, value: productId }
  ]);
  const row = recordset?.[0];
  if (!row) return res.status(404).json({ error: 'Товар не найден' });
  res.json(row);
});

/* -------------------- CATEGORIES -------------------- */
r.get('/categories', async (_, res) => {
  const pool = await getPool();
  const { recordset } = await execProc(pool, 'GetCategories', []);
  res.json(recordset || []);
});


/* -------------------- FAVORITES -------------------- */
r.post('/favorites', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { productId } = req.body;
  const pool = await getPool();

  await execProc(pool, 'AddToFavorites', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) },
    { name: 'ProductID', type: sql.Int, value: toInt(productId) }
  ]);

  res.json({ ok: true });
});

r.get('/favorites', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();

  const { recordset } = await execProc(pool, 'GetFavorites', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) }
  ]);

  res.json(recordset);
});

r.delete('/favorites/by-product/:productId', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();

  await execProc(pool, 'DeleteFromFavorites', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) },
    { name: 'ProductID', type: sql.Int, value: toInt(req.params.productId) }
  ]);

  res.json({ ok: true });
});

/* -------------------- CART -------------------- */
r.get('/cart', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();

  const { recordset } = await execProc(pool, 'GetCartItems', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) }
  ]);

  res.json(recordset);
});

r.post('/cart/add', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { productId, quantity } = req.body;
  const pool = await getPool();

  const { recordset } = await execProc(pool, 'UpsertCartItem', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) },
    { name: 'ProductID', type: sql.Int, value: toInt(productId) },
    { name: 'QuantityDelta', type: sql.Int, value: toInt(quantity ?? 1) }
  ]);

  res.json(recordset?.[0] ?? { ok: true });
});

r.post('/cart/set', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { productId, quantity } = req.body;
  const pool = await getPool();

  await execProc(pool, 'SetCartItemQuantity', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) },
    { name: 'ProductID', type: sql.Int, value: toInt(productId) },
    { name: 'Quantity', type: sql.Int, value: toInt(quantity) }
  ]);

  res.json({ ok: true });
});

r.delete('/cart/:productId', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();

  await execProc(pool, 'DeleteFromCart', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) },
    { name: 'ProductID', type: sql.Int, value: toInt(req.params.productId) }
  ]);

  res.json({ ok: true });
});

/* -------------------- ORDERS -------------------- */
r.post('/orders/create', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { promoCode } = req.body;
  const pool = await getPool();

  try {
    let promoId: number | null = null;
    if (promoCode) {
      const { recordset: pr } = await execProc(pool, 'GetPromoIdByCode', [
        { name: 'Code', type: sql.NVarChar(100), value: promoCode }
      ]);
      promoId = pr?.[0]?.PromoID ?? null;
    }

    await execProc(pool, 'CreateOrder', [
      { name: 'UserID', type: sql.Int, value: toInt(user.UserID) },
      { name: 'PromoID', type: sql.Int, value: promoId }
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    const errorMsg = err.originalError?.info?.message || err.message || 'Ошибка оформления заказа';
    res.status(400).json({ error: errorMsg });
  }
});

r.get('/orders', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();

  const { recordset } = await execProc(pool, 'GetUserOrders', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) }
  ]);

  res.json(recordset);
});

r.get('/orders/:orderId', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const pool = await getPool();

  const { recordset } = await execProc(pool, 'GetOrderDetails', [
    { name: 'UserID', type: sql.Int, value: toInt(user.UserID) },
    { name: 'OrderID', type: sql.Int, value: toInt(req.params.orderId) }
  ]);

  res.json(recordset);
});

/* -------------------- ADMIN: PRODUCTS -------------------- */
r.post('/admin/products/add', requireAuth, requireRole('Admin'), async (req, res) => {
  const admin = (req as any).user;
  const { productName, description, categoryId, price, stockQuantity, imageUrl } = req.body;
  const pool = await getPool();

  try {
    if (!productName || !description || !categoryId || !price || !stockQuantity) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

     // Устанавливаем context_info для триггера
    await pool.request()
      .query("set context_info 0x" + toInt(admin.UserID).toString(16).padStart(8, '0') + "000000000000000000000000");


    await execProc(pool, 'AddProduct', [
      { name: 'UserID', type: sql.Int, value: toInt(admin.UserID) },
      { name: 'ProductName', type: sql.NVarChar(100), value: productName },
      { name: 'Description', type: sql.NVarChar(sql.MAX), value: description },
      { name: 'CategoryID', type: sql.Int, value: toInt(categoryId) },
      { name: 'Price', type: sql.Decimal(10, 2), value: Number(price) },
      { name: 'StockQuantity', type: sql.Int, value: toInt(stockQuantity) },
      { name: 'ImageURL', type: sql.NVarChar(500), value: imageUrl ?? null }
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    const errorMsg = err.originalError?.info?.message || err.message || 'Ошибка добавления товара';
    res.status(500).json({ error: errorMsg });
  }
});

r.post('/admin/products/update', requireAuth, requireRole('Admin'), async (req, res) => {
  const admin = (req as any).user;
  const { productId, productName, description, categoryId, price, stockQuantity, imageUrl } = req.body;
  const pool = await getPool();

  try {
    if (!productId || !productName || !description || !categoryId || !price || !stockQuantity) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

     // Устанавливаем context_info для триггера
    await pool.request()
      .query("set context_info 0x" + toInt(admin.UserID).toString(16).padStart(8, '0') + "000000000000000000000000");


    await execProc(pool, 'UpdateProduct', [
      { name: 'UserID', type: sql.Int, value: toInt(admin.UserID) },
      { name: 'ProductID', type: sql.Int, value: toInt(productId) },
      { name: 'ProductName', type: sql.NVarChar(100), value: productName },
      { name: 'Description', type: sql.NVarChar(sql.MAX), value: description },
      { name: 'CategoryID', type: sql.Int, value: toInt(categoryId) },
      { name: 'Price', type: sql.Decimal(10, 2), value: Number(price) },
      { name: 'StockQuantity', type: sql.Int, value: toInt(stockQuantity) },
      { name: 'ImageURL', type: sql.NVarChar(500), value: imageUrl ?? null }
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    const errorMsg = err.originalError?.info?.message || err.message || 'Ошибка обновления товара';
    res.status(500).json({ error: errorMsg });
  }
});

r.post('/admin/products/delete', requireAuth, requireRole('Admin'), async (req, res) => {
  const admin = (req as any).user;
  const { productId } = req.body;
  const pool = await getPool();

  try {
    if (!productId) {
      return res.status(400).json({ error: 'ID товара обязателен' });
    }

     // Устанавливаем context_info для триггера
    await pool.request()
      .query("set context_info 0x" + toInt(admin.UserID).toString(16).padStart(8, '0') + "000000000000000000000000");


    await execProc(pool, 'DeleteProduct', [
      { name: 'UserID', type: sql.Int, value: toInt(admin.UserID) },
      { name: 'ProductID', type: sql.Int, value: toInt(productId) }
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    const errorMsg = err.originalError?.info?.message || err.message || 'Ошибка удаления товара';
    res.status(500).json({ error: errorMsg });
  }
});

/* -------------------- ADMIN: PROMOCODES -------------------- */
r.get('/admin/promocodes', async (_, res) => {
  const pool = await getPool();
  try {
    const { recordset } = await execProc(pool, 'GetPromocodes', []);
    res.json(recordset || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка загрузки промокодов' });
  }
});

r.post('/admin/promocodes/add', requireAuth, requireRole('Admin'), async (req, res) => {
  const admin = (req as any).user;
  const { code, discountPercent, isGlobal, categoryId, validFrom, validTo } = req.body;
  const pool = await getPool();

  try {
    if (!code || !discountPercent) {
      return res.status(400).json({ error: 'Код и процент скидки обязательны' });
    }
    if (discountPercent <= 0 || discountPercent > 100) {
      return res.status(400).json({ error: 'Процент скидки должен быть от 1 до 100' });
    }

    const finalCategoryId = isGlobal ? null : (categoryId || null);
    const finalValidFrom = validFrom ? new Date(validFrom) : new Date();
    const finalValidTo = validTo ? new Date(validTo) : (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d;
    })();

     // Устанавливаем context_info для триггера
    await pool.request()
      .query("set context_info 0x" + toInt(admin.UserID).toString(16).padStart(8, '0') + "000000000000000000000000");


    await execProc(pool, 'AddPromocode', [
      { name: 'UserID', type: sql.Int, value: toInt(admin.UserID) },
      { name: 'Code', type: sql.NVarChar(100), value: code },
      { name: 'DiscountPercent', type: sql.Int, value: toInt(discountPercent) },
      { name: 'IsGlobal', type: sql.Bit, value: Boolean(isGlobal) },
      { name: 'CategoryID', type: sql.Int, value: finalCategoryId },
      { name: 'ValidFrom', type: sql.DateTime, value: finalValidFrom },
      { name: 'ValidTo', type: sql.DateTime, value: finalValidTo }
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    const errorMsg = err.originalError?.info?.message || err.message || 'Ошибка добавления промокода';
    res.status(500).json({ error: errorMsg });
  }
});

r.post('/admin/promocodes/delete', requireAuth, requireRole('Admin'), async (req, res) => {
  const admin = (req as any).user;
  const { promoId } = req.body;
  const pool = await getPool();

  try {
    if (!promoId) {
      return res.status(400).json({ error: 'ID промокода обязателен' });
    }


    // Устанавливаем context_info для триггера
    await pool.request()
      .query("set context_info 0x" + toInt(admin.UserID).toString(16).padStart(8, '0') + "000000000000000000000000");

    await execProc(pool, 'DeletePromocode', [
      { name: 'UserID', type: sql.Int, value: toInt(admin.UserID) },
      { name: 'PromoID', type: sql.Int, value: toInt(promoId) }
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    const errorMsg = err.originalError?.info?.message || err.message || 'Ошибка удаления промокода';
    res.status(500).json({ error: errorMsg });
  }
});

/* -------------------- LOGS -------------------- */
r.get('/admin/logs', requireAuth, requireRole('Admin'), async (req, res) => {
  const admin = (req as any).user;
  const pool = await getPool();
  try {
    const userId = toInt(req.query.userId, toInt(admin.UserID));
    const { recordset } = await execProc(pool, 'GetLogs', [
      { name: 'UserID', type: sql.Int, value: userId }
    ]);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const logs = (recordset || []).map((log: any) => ({
      LogID: log.LogID,
      UserID: log.UserID,
      Action: Buffer.isBuffer(log.Action) ? log.Action.toString('utf8') : log.Action,
      Timestamp: log.Timestamp
    }));
    res.json(logs);
  } catch (err: any) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ error: err.message || 'Ошибка загрузки логов' });
  }
});

r.get('/admin/logs/export', requireAuth, requireRole('Admin'), async (_, res) => {
  const pool = await getPool();
  try {
    const resp = await execProc(pool, 'ExportLogsToJSON', []);
    const data = resp.recordset;
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      const json = Object.values(first)[0];
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(json as any);
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка экспорта' });
  }
});

r.post('/admin/logs/import', requireAuth, requireRole('Admin'), async (req, res) => {
  const pool = await getPool();
  try {
    const jsonData = req.body;
    if (!jsonData || !Array.isArray(jsonData)) {
      return res.status(400).json({ error: 'Неверный формат данных. Ожидается массив логов.' });
    }
    const jsonString = JSON.stringify(jsonData);

    await execProc(pool, 'ImportLogsFromJSON', [
      { name: 'JsonData', type: sql.NVarChar(sql.MAX), value: jsonString }
    ]);

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка импорта логов' });
  }
});

r.delete('/admin/logs', requireAuth, requireRole('Admin'), async (req, res) => {
  const admin = (req as any).user;
  const pool = await getPool();
  const userId = toInt(req.query.userId, toInt(admin.UserID));
  await execProc(pool, 'DeleteLogs', [{ name: 'UserID', type: sql.Int, value: userId }]);
  res.json({ ok: true });
});

export default r;
