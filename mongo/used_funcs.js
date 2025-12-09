
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
