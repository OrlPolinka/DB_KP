
------------------------------------------ Таблицы ----------------------------------------------------------------------------------

create table Users (
	UserID int primary key identity(1, 1),
	Username nvarchar(100) not null,
	PasswordHash nvarchar(250) not null,
	Email nvarchar(100) not null unique,
	UserCreatedAt datetime default getdate()
);

create table Admins (
	AdminID int primary key identity(1, 1),
	Adminname nvarchar(100) not null,
	PasswordHash nvarchar(250) not null,
	Email nvarchar(100) not null unique,
	AdminCreatedAt datetime default getdate()
);

create table Products(
	ProductID int primary key identity(1, 1),
	ProductName nvarchar(100) not null,
	Description nvarchar(MAX) not null,
	Category nvarchar(200) not null,
	Price decimal(10, 2) not null,
	StockQuantity int not null,
	ImageURL nvarchar(500),
	ProductCreatedAt datetime default getdate()
);

create table Promocodes (
	PromoID int primary key identity(1, 1),
	Code nvarchar(100) not null unique,
	DiscountPercent int not null,
	IsGlobal bit default 0, --если true, то применяется ко всем товарам
	Category nvarchar(200) null, --если указан, то применяется к определенной категории товаров
	ValidFrom datetime not null,
	ValidTo datetime not null
);

create table Favorites (
	FavoriteID int primary key identity(1, 1),
	UserID int not null,
	ProductID int not null,

	constraint FK_Favorites_Users foreign key (UserID)
		references Users(UserID),

	constraint FK_Favorites_Products foreign key (ProductID)
		references Products(ProductID),

	constraint UQ_Favorites_UserProduct unique (UserID, ProductID) --чтобы один пользователь не добавлял в избранное один и тот же товар несколько раз
);

--корзина
create table CartItems (
	CartItemID int primary key identity(1, 1),
	UserID int not null,
	ProductID int not null,
	Quantity int check (Quantity > 0),

	constraint FK_CartItems_Users foreign key (UserID)
		references Users(UserID),

	constraint FK_CartItems_Products foreign key (ProductID)
		references Products(ProductID)
);

--статусы заказов:
	--pending - заказ создан, но не оплачен
	--paid - заказ оплачен, ожидает обработки
	--processing - заказ собирается/готовится к отправке
	--shipped - заказ отправлен клиенту
	--delivered - заказ доставлен клиенту
	--cancelled - заказ отменен
	--returned - заказ возвращен
	--failed - ошибка оплаты/доставки
create table OrderStatuses (
	StatusID int primary key identity(1, 1),
	StatusCode nvarchar(20) not null unique,
	DisplayName nvarchar(100) not null,
	SortOrder int
);

--заказы
create table Orders (
	OrderID int primary key identity(1, 1),
	UserID int not null,
	OrderDate datetime default getdate(),
	TotalPrice decimal(10, 2) not null,
	PromoID int null,
	StatusID int not null,

	constraint FK_Orders_Users foreign key (UserID)
		references Users(UserID),

	constraint FK_Orders_Promocodes foreign key (PromoID)
		references Promocodes(PromoID),

	constraint FK_Orders_OrderStatuses foreign key (StatusID)
		references OrderStatuses(StatusID)
);

--товары в заказе
create table OrderItems (
	OrderItemID int primary key identity(1, 1),
	OrderID int not null,
	ProductID int not null,
	Quantity int check(Quantity > 0),
	UnitPrice decimal(10, 2) not null,

	constraint FK_OrderItems_Orders foreign key (OrderID)
		references Orders(OrderID),

	constraint FK_OrderItems_Products foreign key (ProductID)
		references Products(ProductID)
);

--отслеживание действий админа
create table Logs (
	LogID int primary key identity(1, 1),
	AdminID int not null,
	Action nvarchar(250) not null,
	Timestamp datetime default getdate(),

	constraint FK_Logs_Admins foreign key (AdminID)
		references Admins(AdminID)
);


----------------------------------------------- Хранимые процедуры -----------------------------------------------------------------------------

create procedure AddProduct
	@ProductName nvarchar(100),
	@Description nvarchar(MAX),
	@Category nvarchar(200),
	@Price decimal(10, 2),
	@StockQuantity int,
	@ImageURL nvarchar(500) = null
as begin
	insert into Products(ProductName, Description, Category, Price, StockQuantity, ImageURL)
		values (@ProductName, @Description, @Category, @Price, @StockQuantity, @ImageURL);
end;

create procedure UpdateProduct
	@ProductID int,
	@ProductName nvarchar(100),
	@Description nvarchar(MAX),
	@Category nvarchar(200),
	@Price decimal(10, 2),
	@StockQuantity int,
	@ImageURL nvarchar(500) = null
as begin
	update Products set 
		ProductName = @ProductName, 
		Description = @Description, 
		Category = @Category, 
		Price = @Price, 
		StockQuantity = @StockQuantity, 
		ImageURL = @ImageURL
	where ProductID = @ProductID;
end;

create procedure DeleteProduct
	@ProductID int
as begin
	delete from Products where ProductID = @ProductID;
end;

create procedure SearchProducts
	@Keyword nvarchar(MAX)
as begin
	select ProductName, Description, Category, Price, StockQuantity, ImageURL from Products where ProductName like '%' + @Keyword + '%';
end;

create procedure FilterSearchProducts
	@Category nvarchar(200)
as begin
	select ProductName, Description, Category, Price, StockQuantity, ImageURL from Products where Category = @Category;
end;

create procedure AddToFavorites
	@UserID int,
	@ProductID int
as begin
	insert into Favorites(UserID, ProductID) values (@UserID, @ProductID);
end;

create procedure DeleteFromFavorites
	@FavoriteID int
as begin
	delete from Favorites where FavoriteID = @FavoriteID;
end;

create procedure GetProducts
as begin
	select ProductName, Description, Category, Price, StockQuantity, ImageURL from Products;
end;

create procedure GetFavorites
	@UserID int
as begin
	select ProductName, Description, Category, Price, StockQuantity, ImageURL 
	from Favorites inner join Products on Favorites.ProductID = Products.ProductID
	where UserID = @UserID;
end;

create procedure AddToCart
	@UserID int,
	@ProductID int,
	@Quantity int
as begin
	insert into CartItems(UserID, ProductID, Quantity) values (@UserID, @ProductID, @Quantity);
end;

create procedure DeleteFromCart
	@UserID int,
	@ProductID int
as begin
	delete from CartItems where UserID = @UserID and ProductID = @ProductID;
end;

create procedure CreateOrder
	@UserID int,
	@PromoID int
as begin
	declare @TotalPrice decimal(10, 2);

	select @TotalPrice = sum(Price * Quantity)
	from CartItems inner join Products on CartItems.ProductID = Products.ProductID
	where UserID = @UserID;

	declare @OrderID int;
	insert into Orders (UserID, TotalPrice, PromoID, StatusID)
	values (@UserID, @TotalPrice, @PromoID, (select StatusID from OrderStatuses where StatusCode = 'pending'));
	set @OrderID = scope_identity();

	insert into OrderItems (OrderID, ProductID, Quantity, UnitPrice)
		select @OrderID, CartItems.ProductID, Quantity, Price 
		from CartItems inner join Products on CartItems.ProductID = Products.ProductID
		where UserID = @UserID;
	
	delete from CartItems where UserID = @UserID;
end;

create procedure GetUserOrders
	@UserID int
as begin
	select Orders.OrderID, Orders.OrderDate, Orders.TotalPrice, OrderStatuses.DisplayName
	from Orders inner join OrderStatuses on Orders.StatusID = OrderStatuses.StatusID
	where UserID = @UserID;
end;

create procedure AddPromocode
	@Code nvarchar(100),
	@DiscountPercent int,
	@IsGlobal bit, 
	@Category nvarchar(200) = null,
	@ValidFrom datetime,
	@ValidTo datetime
as begin
	insert into Promocodes(Code, DiscountPercent, IsGlobal, Category, ValidFrom, ValidTo) 
		values (@Code, @DiscountPercent, @IsGlobal, @Category, @ValidFrom, @ValidTo);
end;

create procedure DeletePromocode
	@PromoID int
as begin
	delete from Promocodes where PromoID = @PromoID;
end;

create procedure GetPromocodes
as begin
	select Code, DiscountPercent, IsGlobal, Category, ValidFrom, ValidTo from Promocodes;
end;

create procedure RegisterUser
	@Username nvarchar(100),
	@PasswordHash nvarchar(250),
	@Email nvarchar(100)
as begin
	insert into Users(Username, PasswordHash, Email) values (@Username, @PasswordHash, @Email);
end;

create procedure LoginUser
	@Username nvarchar(100),
	@PasswordHash nvarchar(250)
as begin
	select UserID, Username, Email from Users
	where Username = @Username and PasswordHash = @PasswordHash;
end;

create procedure LoginAdmin
	@Adminname nvarchar(100),
	@PasswordHash nvarchar(250)
as begin
	select AdminID, Adminname, Email from Admins
	where Adminname = @Adminname and PasswordHash = @PasswordHash;
end;