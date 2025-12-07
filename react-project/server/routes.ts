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
  const size = Number(req.query.size ?? 52);
  const resp = await pool.request()
    .input('PageNumber', sql.Int, page)
    .input('PageSize', sql.Int, size)
    .execute('GetProductsPaged');
  res.json(resp.recordset);
});


r.get('/products/top100', async (_, res) => {
  const pool = await getPool();
  try {
    // Представление vw_top100Products возвращает только базовые поля
    // Нужно получить полную информацию о товарах
    const resp = await pool.request().execute('GetTop100Products');
    const topProducts = resp.recordset || [];
    
    if (!Array.isArray(topProducts) || topProducts.length === 0) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.json([]);
    }
    
    // Получаем полную информацию о каждом товаре
    const fullProducts = await Promise.all(
      topProducts.map(async (item: any) => {
        try {
          const productResp = await pool.request()
            .input('ProductID', sql.Int, item.ProductID)
            .execute('GetProductDetails');
          return productResp.recordset?.[0] || null;
        } catch (err) {
          console.error(`Ошибка получения товара ${item.ProductID}:`, err);
          return null;
        }
      })
    );
    
    // Фильтруем null значения
    const validProducts = fullProducts.filter(p => p !== null);
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(validProducts);
  } catch (err: any) {
    console.error('Ошибка загрузки топ-100:', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ error: err.message || 'Ошибка загрузки топ-100' });
  }
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
  try {
    const keyword = String(req.query.q || '').trim();
    if (!keyword) {
      return res.json([]);
    }
    
    console.log('Поиск по ключевому слову:', keyword);
    const resp = await pool.request()
      .input('Keyword', sql.NVarChar(sql.MAX), keyword)
      .execute('SearchProducts');
    
    const data = resp.recordset || [];
    console.log('Найдено товаров:', data.length);
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    console.error('Ошибка поиска:', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ error: err.message || 'Ошибка поиска' });
  }
});

r.get('/products/search-paged', async (req, res) => {
  const pool = await getPool();
  const page = Number(req.query.page ?? 1);
  const size = Number(req.query.size ?? 52);
  const keyword = String(req.query.q || '').trim();
  
  console.log('Поиск (пагинированный):', { keyword, page, size });
  
  if (!keyword) {
    console.log('Пустой запрос поиска');
    return res.json([]);
  }
  
  try {
    // Сначала пробуем вызвать пагинированную процедуру
    const resp = await pool.request()
      .input('Keyword', sql.NVarChar(sql.MAX), keyword)
      .input('PageNumber', sql.Int, page)
      .input('PageSize', sql.Int, size)
      .execute('SearchProductsPaged');
    
    const data = resp.recordset || [];
    console.log('Найдено товаров (пагинированный):', data.length);
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    console.log('Пагинированная процедура не найдена, используем обычный поиск');
    // Если процедура не существует, используем обычный поиск и пагинацию на клиенте
    try {
      const resp = await pool.request()
        .input('Keyword', sql.NVarChar(sql.MAX), keyword)
        .execute('SearchProducts');
      
      const all = resp.recordset || [];
      console.log('Всего найдено товаров:', all.length);
      
      if (!Array.isArray(all)) {
        console.log('Данные не являются массивом:', typeof all);
        return res.json([]);
      }
      
      const start = (page - 1) * size;
      const end = start + size;
      const paginated = all.slice(start, end);
      console.log('Возвращаем товары:', paginated.length);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json(paginated);
    } catch (err2: any) {
      console.error('Ошибка поиска:', err2);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.status(500).json({ error: err2.message || 'Ошибка поиска' });
    }
  }
});

r.get('/products/by-category', async (req, res) => {
  const pool = await getPool();
  try {
    const { categoryId, categoryName } = req.query;
    console.log('Фильтрация по категории:', { categoryId, categoryName });
    
    let finalCategoryId: number | null = null;
    
    if (categoryId) {
      finalCategoryId = Number(categoryId);
    } else if (categoryName) {
      // Получаем CategoryID по имени категории
      const catResp = await pool.request()
        .input('CategoryName', sql.NVarChar(200), String(categoryName))
        .execute('GetCategoryIdByName');
      finalCategoryId = catResp.recordset?.[0]?.CategoryID ?? null;
      
      if (!finalCategoryId) {
        console.log('Категория не найдена:', categoryName);
        return res.json([]);
      }
    } else {
      return res.json([]);
    }
    
    const resp = await pool.request()
      .input('CategoryID', sql.Int, finalCategoryId)
      .execute('FilterSearchProducts');
    const data = resp.recordset || [];
    console.log('Найдено товаров по CategoryID:', data.length);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    console.error('Ошибка фильтрации по категории:', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ error: err.message || 'Ошибка фильтрации' });
  }
});

r.get('/products/by-category-paged', async (req, res) => {
  const pool = await getPool();
  const { categoryId, categoryName, page, size } = req.query;
  const pageNum = Number(page ?? 1);
  const pageSize = Number(size ?? 52);
  
  console.log('Фильтрация по категории (пагинированная):', { categoryId, categoryName, pageNum, pageSize });
  
  let finalCategoryId: number | null = null;
  
  if (categoryId) {
    finalCategoryId = Number(categoryId);
  } else if (categoryName) {
    // Получаем CategoryID по имени категории
    try {
      const catResp = await pool.request()
        .input('CategoryName', sql.NVarChar(200), String(categoryName))
        .execute('GetCategoryIdByName');
      finalCategoryId = catResp.recordset?.[0]?.CategoryID ?? null;
      
      if (!finalCategoryId) {
        console.log('Категория не найдена:', categoryName);
        return res.json([]);
      }
    } catch (err: any) {
      console.error('Ошибка получения CategoryID:', err);
      return res.status(500).json({ error: 'Ошибка получения категории' });
    }
  } else {
    return res.json([]);
  }
  
  try {
    // Пробуем использовать пагинированную процедуру, если она существует
    try {
      const resp = await pool.request()
        .input('CategoryID', sql.Int, finalCategoryId)
        .input('PageNumber', sql.Int, pageNum)
        .input('PageSize', sql.Int, pageSize)
        .execute('FilterSearchProductsPaged');
      
      const data = resp.recordset || [];
      console.log('Найдено товаров (пагинированная фильтрация):', data.length);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.json(Array.isArray(data) ? data : []);
    } catch (pagedErr: any) {
      // Если пагинированная процедура не существует, используем обычную и пагинацию на клиенте
      console.log('Пагинированная процедура не найдена, используем обычную');
      const resp = await pool.request()
        .input('CategoryID', sql.Int, finalCategoryId)
        .execute('FilterSearchProducts');
      
      const all = resp.recordset || [];
      console.log('Всего найдено товаров:', all.length);
      
      if (!Array.isArray(all)) {
        console.log('Данные не являются массивом:', typeof all);
        return res.json([]);
      }
      
      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;
      const paginated = all.slice(start, end);
      console.log('Возвращаем товары:', paginated.length);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json(paginated);
    }
  } catch (err: any) {
    console.error('Ошибка фильтрации:', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ error: err.message || 'Ошибка фильтрации' });
  }
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

  try {
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
  } catch (err: any) {
    console.error('Ошибка создания заказа:', err);
    const errorMsg = err.originalError?.info?.message || err.message || 'Ошибка оформления заказа';
    res.status(400).json({ error: errorMsg });
  }
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
  
  try {
    console.log('Добавление товара:', { productName, categoryId, price, stockQuantity, admin: admin.UserID });
    
    if (!productName || !description || !categoryId || !price || !stockQuantity) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    const result = await pool.request()
      .input('UserID', sql.Int, admin.UserID)
      .input('ProductName', sql.NVarChar(100), productName)
      .input('Description', sql.NVarChar(sql.MAX), description)
      .input('CategoryID', sql.Int, categoryId)
      .input('Price', sql.Decimal(10, 2), price)
      .input('StockQuantity', sql.Int, stockQuantity)
      .input('ImageURL', sql.NVarChar(500), imageUrl ?? null)
      .execute('AddProduct');
    
    // Проверяем, есть ли ошибки в результате
    if (result.returnValue !== 0) {
      throw new Error('Процедура вернула ошибку');
    }
    
    console.log('Товар добавлен успешно');
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Ошибка добавления товара:', err);
    console.error('Детали ошибки:', {
      message: err.message,
      originalError: err.originalError,
      info: err.originalError?.info,
      number: err.originalError?.number,
      state: err.originalError?.state
    });
    
    // SQL Server ошибки могут быть в разных местах
    let errorMsg = 'Ошибка добавления товара';
    if (err.originalError?.info?.message) {
      errorMsg = err.originalError.info.message;
    } else if (err.originalError?.message) {
      errorMsg = err.originalError.message;
    } else if (err.message) {
      errorMsg = err.message;
    }
    
    res.status(500).json({ error: errorMsg });
  }
});

r.post('/admin/products/update', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { productId, productName, description, categoryId, price, stockQuantity, imageUrl } = req.body;
  const pool = await getPool();
  
  try {
    console.log('Обновление товара:', { productId, productName, categoryId, price, admin: admin.UserID });
    
    if (!productId || !productName || !description || !categoryId || !price || !stockQuantity) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }
    
    const result = await pool.request()
      .input('UserID', sql.Int, admin.UserID)
      .input('ProductID', sql.Int, productId)
      .input('ProductName', sql.NVarChar(100), productName)
      .input('Description', sql.NVarChar(sql.MAX), description)
      .input('CategoryID', sql.Int, categoryId)
      .input('Price', sql.Decimal(10, 2), price)
      .input('StockQuantity', sql.Int, stockQuantity)
      .input('ImageURL', sql.NVarChar(500), imageUrl ?? null)
      .execute('UpdateProduct');
    
    // Проверяем, есть ли ошибки в результате
    if (result.returnValue !== 0) {
      throw new Error('Процедура вернула ошибку');
    }
    
    console.log('Товар обновлен успешно');
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Ошибка обновления товара:', err);
    console.error('Детали ошибки:', {
      message: err.message,
      originalError: err.originalError,
      info: err.originalError?.info,
      number: err.originalError?.number,
      state: err.originalError?.state
    });
    
    let errorMsg = 'Ошибка обновления товара';
    if (err.originalError?.info?.message) {
      errorMsg = err.originalError.info.message;
    } else if (err.originalError?.message) {
      errorMsg = err.originalError.message;
    } else if (err.message) {
      errorMsg = err.message;
    }
    
    res.status(500).json({ error: errorMsg });
  }
});

r.post('/admin/products/delete', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { productId } = req.body;
  const pool = await getPool();
  
  try {
    console.log('Удаление товара:', { productId, admin: admin.UserID });
    
    if (!productId) {
      return res.status(400).json({ error: 'ID товара обязателен' });
    }
    
    const result = await pool.request()
      .input('UserID', sql.Int, admin.UserID)
      .input('ProductID', sql.Int, productId)
      .execute('DeleteProduct');
    
    // Проверяем, есть ли ошибки в результате
    if (result.returnValue !== 0) {
      throw new Error('Процедура вернула ошибку');
    }
    
    console.log('Товар удален успешно');
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Ошибка удаления товара:', err);
    console.error('Детали ошибки:', {
      message: err.message,
      originalError: err.originalError,
      info: err.originalError?.info,
      number: err.originalError?.number,
      state: err.originalError?.state
    });
    
    let errorMsg = 'Ошибка удаления товара';
    if (err.originalError?.info?.message) {
      errorMsg = err.originalError.info.message;
    } else if (err.originalError?.message) {
      errorMsg = err.originalError.message;
    } else if (err.message) {
      errorMsg = err.message;
    }
    
    res.status(500).json({ error: errorMsg });
  }
});

/* -------------------- ADMIN: PROMOCODES -------------------- */
r.get('/admin/promocodes', async (_, res) => {
  const pool = await getPool();
  try {
    const resp = await pool.request().execute('GetPromocodes');
    res.json(resp.recordset || []);
  } catch (err: any) {
    console.error('Ошибка загрузки промокодов:', err);
    res.status(500).json({ error: err.message || 'Ошибка загрузки промокодов' });
  }
});

r.post('/admin/promocodes/add', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { code, discountPercent, isGlobal, categoryId, validFrom, validTo } = req.body;
  const pool = await getPool();
  
  try {
    console.log('Добавление промокода:', { code, discountPercent, isGlobal, categoryId, admin: admin.UserID });
    
    // Проверяем обязательные поля
    if (!code || !discountPercent) {
      return res.status(400).json({ error: 'Код и процент скидки обязательны' });
    }
    
    if (discountPercent <= 0 || discountPercent > 100) {
      return res.status(400).json({ error: 'Процент скидки должен быть от 1 до 100' });
    }
    
    // Если промокод глобальный, categoryId должен быть null
    const finalCategoryId = isGlobal ? null : (categoryId || null);
    
    // Преобразуем даты
    let finalValidFrom: Date | null = null;
    let finalValidTo: Date | null = null;
    
    if (validFrom) {
      finalValidFrom = new Date(validFrom);
    } else {
      finalValidFrom = new Date(); // По умолчанию - текущая дата
    }
    
    if (validTo) {
      finalValidTo = new Date(validTo);
    } else {
      // Если ValidTo не указан, устанавливаем дату через год
      finalValidTo = new Date();
      finalValidTo.setFullYear(finalValidTo.getFullYear() + 1);
    }
    
    const result = await pool.request()
      .input('UserID', sql.Int, admin.UserID)
      .input('Code', sql.NVarChar(100), code)
      .input('DiscountPercent', sql.Int, discountPercent)
      .input('IsGlobal', sql.Bit, isGlobal)
      .input('CategoryID', sql.Int, finalCategoryId)
      .input('ValidFrom', sql.DateTime, finalValidFrom)
      .input('ValidTo', sql.DateTime, finalValidTo)
      .execute('AddPromocode');
    
    // Проверяем, есть ли ошибки в результате
    if (result.returnValue !== 0) {
      throw new Error('Процедура вернула ошибку');
    }
    
    console.log('Промокод добавлен успешно');
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Ошибка добавления промокода:', err);
    console.error('Детали ошибки:', {
      message: err.message,
      originalError: err.originalError,
      info: err.originalError?.info,
      number: err.originalError?.number,
      state: err.originalError?.state
    });
    
    let errorMsg = 'Ошибка добавления промокода';
    if (err.originalError?.info?.message) {
      errorMsg = err.originalError.info.message;
    } else if (err.originalError?.message) {
      errorMsg = err.originalError.message;
    } else if (err.message) {
      errorMsg = err.message;
    }
    
    res.status(500).json({ error: errorMsg });
  }
});

r.post('/admin/promocodes/delete', requireAuth, async (req, res) => {
  const admin = (req as any).user;
  const { promoId } = req.body;
  const pool = await getPool();
  
  try {
    console.log('Удаление промокода:', { promoId, admin: admin.UserID });
    
    if (!promoId) {
      return res.status(400).json({ error: 'ID промокода обязателен' });
    }
    
    const result = await pool.request()
      .input('UserID', sql.Int, admin.UserID)
      .input('PromoID', sql.Int, promoId)
      .execute('DeletePromocode');
    
    // Проверяем, есть ли ошибки в результате
    if (result.returnValue !== 0) {
      throw new Error('Процедура вернула ошибку');
    }
    
    console.log('Промокод удален успешно');
    res.json({ ok: true });
  } catch (err: any) {
    console.error('Ошибка удаления промокода:', err);
    console.error('Детали ошибки:', {
      message: err.message,
      originalError: err.originalError,
      info: err.originalError?.info,
      number: err.originalError?.number,
      state: err.originalError?.state
    });
    
    let errorMsg = 'Ошибка удаления промокода';
    if (err.originalError?.info?.message) {
      errorMsg = err.originalError.info.message;
    } else if (err.originalError?.message) {
      errorMsg = err.originalError.message;
    } else if (err.message) {
      errorMsg = err.message;
    }
    
    res.status(500).json({ error: errorMsg });
  }
});

/* -------------------- LOGS -------------------- */
r.get('/admin/logs', async (req, res) => {
  const pool = await getPool();
  try {
    const userId = Number(req.query.userId);
    const resp = await pool.request()
      .input('UserID', sql.Int, userId)
      .execute('GetLogs');
    
    // Устанавливаем правильную кодировку для ответа
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    // Преобразуем данные, убеждаясь в правильной кодировке
    const logs = (resp.recordset || []).map((log: any) => {
      // Если Action приходит как Buffer (проблема с кодировкой), конвертируем
      let action = log.Action;
      if (Buffer.isBuffer(action)) {
        action = action.toString('utf8');
      } else if (typeof action === 'string') {
        // Убеждаемся, что строка правильно декодирована
        action = action;
      }
      
      return {
        LogID: log.LogID,
        UserID: log.UserID,
        Action: action,
        Timestamp: log.Timestamp
      };
    });
    
    res.json(logs);
  } catch (err: any) {
    console.error('Ошибка загрузки логов:', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(500).json({ error: err.message || 'Ошибка загрузки логов' });
  }
});

r.get('/admin/logs/export', async (_, res) => {
  const pool = await getPool();
  try {
    const resp = await pool.request().execute('ExportLogsToJSON');
    const data = resp.recordset;
    if (Array.isArray(data) && data.length > 0) {
      const first = data[0];
      const json = Object.values(first)[0];
      // Устанавливаем правильную кодировку
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(json);
    }
    res.json(data);
  } catch (err: any) {
    console.error('Ошибка экспорта:', err);
    res.status(500).json({ error: err.message || 'Ошибка экспорта' });
  }
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

