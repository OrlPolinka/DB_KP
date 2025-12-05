db.createCollection("users");
db.createCollection("roles");
db.createCollection("userRoles");
db.createCollection("products");
db.createCollection("categories");
db.createCollection("promocodes");
db.createCollection("orders");
db.createCollection("orderItems");
db.createCollection("favorites");
db.createCollection("cartItems");




/////////////////////////////////////////////////////////// Товары //////////////////////////////////////////////////////////////////
const addProduct = function(userId, productData) {
  const adminRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "Admin" });
  if (!adminRole) {
    throw "Ошибка: только администратор может добавлять товары";
  }

  const now = new Date();
  const newProduct = {
    _id: new ObjectId(),
    productName: productData.productName,
    description: productData.description,
    categoryId: ObjectId(productData.categoryId),
    price: productData.price,
    stockQuantity: productData.stockQuantity,
    imageUrl: productData.imageUrl,
    created_at: now,
    updated_at: now
  };

  return db.products.insertOne(newProduct);
};


const updateProduct = function(userId, productId, updateData) {
  const adminRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "Admin" });
  if (!adminRole) {
    throw "Ошибка: только администратор может изменять товары";
  }

  updateData.updated_at = new Date();
  return db.products.updateOne(
    { _id: ObjectId(productId) },
    { $set: updateData }
  );
};


const deleteProduct = function(userId, productId) {
  const adminRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "Admin" });
  if (!adminRole) {
    throw "Ошибка: только администратор может удалять товары";
  }

  return db.products.deleteOne({ _id: ObjectId(productId) });
};


const getProducts = function() {
  return db.products.aggregate([
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category"
      }
    },
    { $unwind: "$category" },
    {
      $project: {
        productName: 1,
        description: 1,
        categoryName: "$category.CategoryName", 
        price: 1,
        stockQuantity: 1,
        imageUrl: 1
      }
    }
  ]).toArray();
};


const searchProducts = function(keyword) {
  return db.products.find({ productName: { $regex: keyword, $options: "i" } }).toArray();
};

const filterSearchProducts = function(categoryId) {
  return db.products.find({ categoryId: ObjectId(categoryId) }).toArray();
};


const getTop100Products = function() {
  return db.orderItems.aggregate([
    {
      $group: {
        _id: "$productId",
        totalSold: { $sum: "$quantity" },
        totalRevenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } }
      }
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $project: {
        productId: "$_id",
        productName: "$product.productName",
        categoryId: "$product.categoryId",
        totalSold: 1,
        totalRevenue: 1
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 100 }
  ]).toArray();
};



/////////////////////////////////////////////////////////// Промокоды //////////////////////////////////////////////////////////////////

const addPromocode = function(userId, promoData) {
  const adminRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "Admin" });
  if (!adminRole) {
    throw "Ошибка: только администратор может добавлять промокоды";
  }

  if (db.promocodes.findOne({ code: promoData.code })) {
    throw "Ошибка: промокод с таким кодом уже существует";
  }

  const newPromo = {
    _id: new ObjectId(),
    code: promoData.code,
    discountPercent: promoData.discountPercent,
    isGlobal: promoData.isGlobal,
    categoryId: promoData.categoryId ? ObjectId(promoData.categoryId) : null,
    validFrom: new Date(promoData.validFrom),
    validTo: new Date(promoData.validTo)
  };

  return db.promocodes.insertOne(newPromo);
};


const deletePromocode = function(userId, promoId) {
  const adminRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "Admin" });
  if (!adminRole) {
    throw "Ошибка: только администратор может удалять промокоды";
  }

  return db.promocodes.deleteOne({ _id: ObjectId(promoId) });
};

const getPromocodes = function() {
  return db.promocodes.find().toArray();
};



/////////////////////////////////////////////////////////// Заказы //////////////////////////////////////////////////////////////////

const createOrder = function(userId, promoId) {
  const userRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "User" });
  if (!userRole) {
    throw "Ошибка: только пользователь может создавать заказ";
  }

  const cartItems = db.cartItems.find({ userId: ObjectId(userId) }).toArray();
  if (cartItems.length === 0) {
    throw "Ошибка: корзина пуста";
  }

  const discount = promoId ? db.promocodes.findOne({ _id: ObjectId(promoId) }) : null;

  const orderId = new ObjectId();
  db.orders.insertOne({
    _id: orderId,
    userId: ObjectId(userId),
    promoId: promoId ? ObjectId(promoId) : null,
    status: "pending",
    created_at: new Date()
  });

  cartItems.forEach(item => {
    const basePrice = item.unitPrice;
    const finalPrice = discount ? basePrice * (1 - discount.discountPercent / 100) : basePrice;

    db.orderItems.insertOne({
      orderId: orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: finalPrice
    });
  });

  db.cartItems.deleteMany({ userId: ObjectId(userId) });
  return orderId;
};


const getUserOrders = function(userId) {
  return db.orders.aggregate([
    { $match: { userId: ObjectId(userId) } },
    {
      $lookup: {
        from: "orderItems",
        localField: "_id",
        foreignField: "orderId",
        as: "items"
      }
    }
  ]).toArray();
};

const getOrderDetails = function(userId, orderId) {
  return db.orders.aggregate([
    { $match: { _id: ObjectId(orderId), userId: ObjectId(userId) } },
    {
      $lookup: {
        from: "orderItems",
        localField: "_id",
        foreignField: "orderId",
        as: "items"
      }
    },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "products"
      }
    }
  ]).toArray();
};

/////////////////////////////////////////////////////////// Пользователи и роли //////////////////////////////////////////////////////////////////

const registerUserWithRole = function(adminUserId, userData, roleName) {
  const adminRole = db.userRoles.findOne({ user_id: ObjectId(adminUserId), role: "Admin" });
  if (!adminRole) throw "Ошибка: только администратор может назначать роли";

  const newUserId = new ObjectId();
  db.users.insertOne({
    _id: newUserId,
    username: userData.username,
    passwordHash: userData.passwordHash,
    email: userData.email
  });

  const role = db.roles.findOne({ roleName: roleName });
  if (!role) throw "Ошибка: роль не найдена";

  db.userRoles.insertOne({ user_id: newUserId, role: roleName });
  return newUserId;
};

const registerUser = function(userData) {
  const newUserId = new ObjectId();
  db.users.insertOne({
    _id: newUserId,
    username: userData.username,
    passwordHash: userData.passwordHash,
    email: userData.email
  });
  db.userRoles.insertOne({ user_id: newUserId, role: "User" });
  return newUserId;
};

const loginUser = function(username, passwordHash) {
  return db.users.aggregate([
    { $match: { username: username, passwordHash: passwordHash } },
    {
      $lookup: {
        from: "userRoles",
        localField: "_id",
        foreignField: "user_id",
        as: "roles"
      }
    }
  ]).toArray();
};



/////////////////////////////////////////////////////////// Избранное //////////////////////////////////////////////////////////////////

const addToFavorites = function(userId, productId) {
  const userRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "User" });
  if (!userRole) throw "Ошибка: только пользователь может добавлять избранное";

  return db.favorites.insertOne({ userId: ObjectId(userId), productId: ObjectId(productId) });
};

const deleteFromFavorites = function(userId, favoriteId) {
  const userRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "User" });
  if (!userRole) throw "Ошибка: только пользователь может удалять избранное";

  return db.favorites.deleteOne({ _id: ObjectId(favoriteId), userId: ObjectId(userId) });
};

const getFavorites = function(userId) {
  return db.favorites.aggregate([
    { $match: { userId: ObjectId(userId) } },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" }
  ]).toArray();
};



/////////////////////////////////////////////////////////// Корзина //////////////////////////////////////////////////////////////////

const addToCart = function(userId, productId, quantity) {
  const userRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "User" });
  if (!userRole) throw "Ошибка: только пользователь может добавлять в корзину";

  return db.cartItems.insertOne({ userId: ObjectId(userId), productId: ObjectId(productId), quantity: quantity });
};

const deleteFromCart = function(userId, productId) {
  const userRole = db.userRoles.findOne({ user_id: ObjectId(userId), role: "User" });
  if (!userRole) throw "Ошибка: только пользователь может удалять из корзины";

  return db.cartItems.deleteOne({ userId: ObjectId(userId), productId: ObjectId(productId) });
};

const getCartItems = function(userId) {
  return db.cartItems.aggregate([
    { $match: { userId: ObjectId(userId) } },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" }
  ]).toArray();
};



//////////////////////////////////////////////////////////////// Использование ////////////////////////////////////////////////////////////////////


const adminId = new ObjectId();
db.users.insertOne({
  _id: adminId,
  username: "Admin",
  passwordHash: "hash-admin",
  email: "admin@gmail.com"
});
db.userRoles.insertOne({ user_id: adminId, role: "Admin" });


const userId = registerUser({
  username: "User1",
  passwordHash: "hash-user1",
  email: "user1@gmail.com"
});


print("=== Логин пользователя ===");
printjson(loginUser("User1", "hash-user1"));


const categoryId = db.categories.insertOne({ CategoryName: "Одежда" }).insertedId;

print("=== Добавление товара админом ===");
printjson(addProduct(adminId, {
  productName: "Winter Jacket",
  description: "Тёплая зимняя куртка",
  categoryId: categoryId,
  price: 199.99,
  stockQuantity: 50,
  imageUrl: "images/jacket.jpg"
}));

print("=== Все товары ===");
printjson(getProducts());


print("=== Поиск товара по ключевому слову 'Jacket' ===");
printjson(searchProducts("Jacket"));


const productId = db.products.findOne({ productName: "Winter Jacket" })._id;

print("=== Добавление в избранное ===");
printjson(addToFavorites(userId, productId));

print("=== Избранное пользователя ===");
printjson(getFavorites(userId));

print("=== Добавление в корзину ===");
printjson(addToCart(userId, productId, 2));

print("=== Корзина пользователя ===");
printjson(getCartItems(userId));


print("=== Создание заказа ===");
const orderId = createOrder(userId, null);
printjson(orderId);

print("=== Заказы пользователя ===");
printjson(getUserOrders(userId));

print("=== Детали заказа ===");
printjson(getOrderDetails(userId, orderId));


print("=== Добавление промокода ===");
printjson(addPromocode(adminId, {
  code: "WINTER50",
  discountPercent: 50,
  isGlobal: true,
  categoryId: null,
  validFrom: new Date(),
  validTo: new Date(new Date().setDate(new Date().getDate() + 30))
}));

print("=== Все промокоды ===");
printjson(getPromocodes());


print("=== Топ‑100 товаров по продажам ===");
printjson(getTop100Products());
