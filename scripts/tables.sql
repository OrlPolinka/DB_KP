create table Users (
	UserID int primary key identity(1, 1),
	Username nvarchar(100) not null,
	PasswordHash nvarchar(250) not null,
	Email nvarchar(100) not null unique,
	UserCreatedAt datetime default getdate()
);

create table Roles(
	RoleID int primary key identity(1, 1),
	RoleName nvarchar(50) not null unique
);

create table UserRoles(
	UserRolesID int primary key identity(1, 1),
	RoleID int not null,
	UserID int not null,

	constraint FK_Users_UserRoles foreign key (UserID)
		references Users(UserID),

	constraint FK_Roles_UserRoles foreign key (RoleID)
		references Roles(RoleID)
);

create table Categories(
	CategoryID int primary key identity(1, 1),
	CategoryName nvarchar(200) not null unique
);

create table Products(
	ProductID int primary key identity(1, 1),
	ProductName nvarchar(100) not null,
	Description nvarchar(MAX) not null,
	CategoryID int not null,
	Price decimal(10, 2) not null,
	StockQuantity int not null,
	ImageURL nvarchar(500),
	ProductCreatedAt datetime default getdate(),

	constraint FK_Categories_Products foreign key (CategoryID)
		references Categories(CategoryID)
);

create table Promocodes (
	PromoID int primary key identity(1, 1),
	Code nvarchar(100) not null unique,
	DiscountPercent int not null,
	IsGlobal bit default 0, --если true, то применяется ко всем товарам
	CategoryID int null, --если указан, то применяется к определенной категории товаров
	ValidFrom datetime not null,
	ValidTo datetime not null,

	constraint FK_Categories_Promocodes foreign key (CategoryID)
		references Categories(CategoryID)
);
alter table Promocodes add constraint CK_Promocodes_Discount check (DiscountPercent between 0 and 100);

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
	UserID int not null,
	Action nvarchar(250) not null,
	Timestamp datetime default getdate(),

	constraint FK_Logs_Users foreign key (UserID)
		references Users(UserID)
);
