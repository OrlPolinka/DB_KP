declare @UserID int;
select @UserID = Users.UserID from Users join UserRoles on UserRoles.UserID = Users.UserID
									join Roles on Roles.RoleID = UserRoles.RoleID where Roles.RoleName = 'Admin';

declare @bin varbinary(4);
select @bin = cast(@UserID as varbinary(4));
set context_info @bin;

--------------------------------------


insert into Roles(RoleName)
	values ('Admin'), ('User');


------------------------------
declare @i int = 1;
while @i <= 10
begin
	insert into Users(Username, PasswordHash, Email)
	values (
		concat('User-', @i),
		concat('hash_', @i),
		concat('user', @i, '@gmail.com')
	);

	set @i = @i + 1;
end;

------------------------------------
declare @i int = 1;
while @i <= 10
begin
	insert into Categories (CategoryName)
	values (concat('Category_', @i));

	set @i = @i + 1;
end;

------------------------------------------
declare @i int = 1;

while @i <= 100000
begin
	declare @ProductName nvarchar(100);
    declare @Description nvarchar(max);
    declare @CategoryID int;
    declare @Price decimal(10,2);
    declare @StockQuantity int;
    declare @ImageURL nvarchar(500);

    set @ProductName = concat('Product_', @i);
    set @Description = concat('Description for product ', @i);
    set @CategoryID = ((@i % 10) + 1);
    set @Price = round(rand() * 100 + 10, 2);
    set @StockQuantity = (@i % 200) + 1;
    set @ImageURL = 'C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\images\Jacket.jpg';

    exec AddProduct 
        @UserID = 1,
        @ProductName = @ProductName,
        @Description = @Description,
        @CategoryID = @CategoryID,
        @Price = @Price,
        @StockQuantity = @StockQuantity,
        @ImageURL = @ImageURL;

    set @i = @i + 1;
end;


-------------------------------------------------------------
declare @i int = 1;

while @i <= 10
begin
    insert into Promocodes (Code, DiscountPercent, IsGlobal, CategoryID, ValidFrom, ValidTo)
    values (
        concat('Promo', @i),
        (@i % 50) + 1, -- скидка 1–50%
        case when @i % 5 = 0 then 1 else 0 end, -- иногда глобальная
        case when @i % 5 = 0 then null else ((@i % 10) + 1) end,
        dateadd(day, -@i, getdate()), -- начало действия
        dateadd(day, @i, getdate())   -- конец действия
    );

    set @i = @i + 1;
end;



---------------------------------------------------
insert into OrderStatuses (StatusCode, DisplayName, SortOrder)
values
('pending', 'Заказ создан', 1),
('paid', 'Заказ оплачен', 2),
('processing', 'Обработка заказа', 3),
('shipped', 'Отправлен клиенту', 4),
('delivered', 'Доставлен клиенту', 5),
('cancelled', 'Отменён', 6),
('returned', 'Возвращён', 7),
('failed', 'Ошибка оплаты/доставки', 8);

select * from OrderStatuses;

-------------------------------------------
declare @i int = 1;

while @i <= 20
begin
    insert into Orders (UserID, PromoID, StatusID)
    values (
        ((@i % 10) + 1), -- случайный пользователь
        case when @i % 5 = 0 then (@i % 10) + 1 else null end, -- иногда промокод
        ((@i % 8) + 1) -- статус 1..8
    );

    set @i = @i + 1;
end;

----------------------------------------
declare @i int = 1;

while @i <= 30
begin
    insert into OrderItems (OrderID, ProductID, Quantity, UnitPrice)
    values (
        ((@i % 20) + 1), -- заказы 1..50
        ((@i % 100) + 1),
        ((@i % 5) + 1),
        round(rand() * 100 + 10, 2)
    );

    set @i = @i + 1;
end;

-------------------------------------
declare @i int = 1;

while @i <= 15
begin
    insert into Favorites (UserID, ProductID)
    values (
        ((@i % 10) + 1),
        ((@i % 100) + 1)
    );

    set @i = @i + 1;
end;

--------------------------------------
declare @i int = 1;

while @i <= 20
begin
    insert into CartItems (UserID, ProductID, Quantity)
    values (
        ((@i % 10) + 1),
        ((@i % 100) + 1),
        ((@i % 5) + 1)
    );

    set @i = @i + 1;
end;

-------------------------------------

delete from CartItems;
delete from Favorites;
delete from OrderItems;
delete from Orders;
delete from Promocodes;
delete from Products;
delete from Categories;
delete from Users;


-- Сбросить счётчик (если CategoryID — IDENTITY)
DBCC CHECKIDENT ('Categories', RESEED, 0);
DBCC CHECKIDENT ('Products', RESEED, 0);
DBCC CHECKIDENT ('Promocodes', RESEED, 0);
DBCC CHECKIDENT ('Orders', RESEED, 0);
DBCC CHECKIDENT ('OrderItems', RESEED, 0);
DBCC CHECKIDENT ('Favorites', RESEED, 0);
DBCC CHECKIDENT ('CartItems', RESEED, 0);
DBCC CHECKIDENT ('Users', RESEED, 0);

select * from Categories;
select * from Products;
select * from Promocodes;
select * from Orders;
select * from OrderItems;
select * from Favorites;
select * from CartItems;
select * from Users;
select * from Roles;
select * from UserRoles;


-------------------
insert into Users (Username, PasswordHash, Email) values ('Admin', 'hash-admin', 'admin@gmail.com');
insert into UserRoles (UserID, RoleID)
values(
	(select UserID from Users where Username = 'Admin'),
	(select RoleID from Roles where RoleName = 'Admin')
);

insert into Users (Username, PasswordHash, Email)
values ('User2', 'hash_user2', 'user2@gmail.com');

insert into UserRoles (UserID, RoleID)
values (
    (select UserID from Users where Username = 'User2'),
    (select RoleID from Roles where RoleName = 'User')
);

