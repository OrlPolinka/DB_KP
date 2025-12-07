
create or alter procedure GetTop100Products
as begin try
	select * from vw_top100Products;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch


go
create or alter procedure AddProduct
	@UserID int,
	@ProductName nvarchar(100),
	@Description nvarchar(MAX),
	@CategoryID int,
	@Price decimal(10, 2),
	@StockQuantity int,
	@ImageURL nvarchar(500) = null
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: только администратор может добавлять товары', 16, 1);
		return;
	end;

	insert into Products(ProductName, Description, CategoryID, Price, StockQuantity, ImageURL)
		values (@ProductName, @Description, @CategoryID, @Price, @StockQuantity, @ImageURL);
end try
begin catch
	declare @ErrorMessage nvarchar(4000) = error_message();
	raiserror(@ErrorMessage, 16, 1);
end catch
go


create or alter procedure UpdateProduct
	@UserID int,
	@ProductID int,
	@ProductName nvarchar(100),
	@Description nvarchar(MAX),
	@CategoryID int,
	@Price decimal(10, 2),
	@StockQuantity int,
	@ImageURL nvarchar(500) = null
as begin try
  begin transaction;

	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: только администратор может изменять товары', 16, 1);
		return;
	end;

	update Products set 
		ProductName = @ProductName, 
		Description = @Description, 
		CategoryID = @CategoryID, 
		Price = @Price, 
		StockQuantity = @StockQuantity, 
		ImageURL = @ImageURL
	where ProductID = @ProductID;

  commit transaction;
end try
begin catch
	rollback transaction;
	declare @ErrorMessage nvarchar(4000) = error_message();
	raiserror(@ErrorMessage, 16, 1);
end catch
go


create or alter procedure DeleteProduct
	@UserID int,
	@ProductID int
as begin try
  begin transaction;

	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: только администратор может удалять товары', 16, 1);
		return;
	end;

	-- Проверяем, используется ли товар в заказах (история заказов)
	if exists(
		select 1 from OrderItems where ProductID = @ProductID
	)
	begin
		raiserror('Невозможно удалить товар: товар используется в заказах. Удаление запрещено для сохранения истории.', 16, 1);
		return;
	end;

	-- Удаляем товар из избранного
	delete from Favorites where ProductID = @ProductID;

	-- Удаляем товар из корзины
	delete from CartItems where ProductID = @ProductID;

	-- Теперь можно удалить товар
	delete from Products where ProductID = @ProductID;

  commit transaction;
end try
begin catch
	rollback transaction;
	declare @ErrorMessage nvarchar(4000) = error_message();
	raiserror(@ErrorMessage, 16, 1);
end catch
go


create or alter procedure SearchProducts
	@Keyword nvarchar(MAX)
as begin try
	-- Поиск нечувствителен к регистру и ищет по названию и описанию
	declare @SearchKeyword nvarchar(MAX);
	
	-- Проверяем и обрабатываем ключевое слово
	if @Keyword is null or LEN(LTRIM(RTRIM(@Keyword))) = 0
	begin
		select top 0
			p.ProductID, p.ProductName, p.Description, c.CategoryName, p.Price,
            p.Price as DiscountedPrice, p.StockQuantity, p.ImageURL
        from Products p
        join Categories c on c.CategoryID = p.CategoryID;
		return;
	end
	
	set @SearchKeyword = '%' + LOWER(LTRIM(RTRIM(@Keyword))) + '%';
	
	-- Если ключевое слово пустое после обработки, возвращаем пустой результат
	if LEN(@SearchKeyword) <= 2
	begin
		select top 0
			p.ProductID, p.ProductName, p.Description, c.CategoryName, p.Price,
            p.Price as DiscountedPrice, p.StockQuantity, p.ImageURL
        from Products p
        join Categories c on c.CategoryID = p.CategoryID;
		return;
	end
	
	select
		p.ProductID,
		p.ProductName,
		p.Description,
		c.CategoryName,
		p.Price,
		case 
			when pr.DiscountPercent is null or pr.DiscountPercent = 0 
			then p.Price
			else p.Price - (p.Price * pr.DiscountPercent / 100.0)
		end as DiscountedPrice,
		p.StockQuantity,
		p.ImageURL
	from Products p 
	join Categories c on c.CategoryID = p.CategoryID
	left join Promocodes pr on pr.CategoryID = p.CategoryID 
		and getdate() between pr.ValidFrom and pr.ValidTo
	where LOWER(p.ProductName) like @SearchKeyword
	   or LOWER(p.Description) like @SearchKeyword
	   or LOWER(c.CategoryName) like @SearchKeyword;
end try
begin catch
	declare @ErrorMessage nvarchar(4000) = error_message();
	declare @ErrorNumber int = error_number();
	declare @ErrorLine int = error_line();
	
	-- Выводим ошибку для отладки
	print 'Ошибка в SearchProducts: ' + @ErrorMessage;
	print 'Номер ошибки: ' + cast(@ErrorNumber as nvarchar(10));
	print 'Строка: ' + cast(@ErrorLine as nvarchar(10));
	
	-- Возвращаем ошибку через RAISERROR для отладки
	raiserror('Ошибка в SearchProducts: %s (Номер: %d, Строка: %d)', 16, 1, @ErrorMessage, @ErrorNumber, @ErrorLine);
end catch
go


create or alter procedure GetProductDetails
    @ProductID int
as
begin try
    select
        p.ProductID,
        p.ProductName,
        p.Description,
        p.CategoryID,
        c.CategoryName,
        p.Price,
        dbo.func_GetDiscountedPrice(p.Price, pr.DiscountPercent) as DiscountedPrice,
        p.StockQuantity,
        p.ImageURL
    from Products p
    join Categories c on c.CategoryID = p.CategoryID
    left join Promocodes pr on pr.CategoryID = p.CategoryID
        and getdate() between pr.ValidFrom and pr.ValidTo
    where p.ProductID = @ProductID;
end try
begin catch
    print 'Ошибка: ' + error_message();
end catch;
go


create or alter procedure FilterSearchProducts
	@CategoryID int 
as begin try

	select 
	ProductID, ProductName, Description, Categories.CategoryName, Price,
	dbo.func_GetDiscountedPrice(Price, Promocodes.DiscountPercent) as DiscountedPrice, StockQuantity, ImageURL 
	from Products join Categories
	on Categories.CategoryID = Products.CategoryID
	left join Promocodes on Promocodes.CategoryID = Products.CategoryID 
	and getdate() between Promocodes.ValidFrom and Promocodes.ValidTo 
	where Categories.CategoryID = @CategoryID;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure AddToFavorites
	@UserID int,
	@ProductID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'User'
	)
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ к избранному', 16, 1);
		return;
	end;

	insert into Favorites(UserID, ProductID) values (@UserID, @ProductID);
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure DeleteFromFavorites
	@UserID int,
	@ProductID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'User'
	)
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ к избранному', 16, 1);
		return;
	end;

	delete from Favorites where UserID = @UserID and ProductID = @ProductID;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure GetProducts
as begin try
	select ProductID, ProductName, Description, Categories.CategoryName, Price,
	dbo.func_GetDiscountedPrice(Price, Promocodes.DiscountPercent) as DiscountedPrice, StockQuantity, ImageURL 
	from Products join Categories
	on Categories.CategoryID = Products.CategoryID
	left join Promocodes on Promocodes.CategoryID = Products.CategoryID 
	and getdate() between Promocodes.ValidFrom and Promocodes.ValidTo;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure GetFavorites
	@UserID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'User'
	)
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ к избранному', 16, 1);
		return;
	end;

	select Products.ProductID, Products.ProductName, Products.Description, 
	Categories.CategoryName, Products.Price, Products.StockQuantity, Products.ImageURL 
	from Favorites join Products on Favorites.ProductID = Products.ProductID
	join Categories on Categories.CategoryID = Products.CategoryID
	where UserID = @UserID;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure DeleteFromCart
	@UserID int,
	@ProductID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'User'
	)
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ к корзине', 16, 1);
		return;
	end;

	delete from CartItems where UserID = @UserID and ProductID = @ProductID;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure CreateOrder
	@UserID int,
	@PromoID int
as begin try
  begin transaction;

	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'User'
	)
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ', 16, 1);
		return;
	end;

	-- Проверка наличия товаров на складе
	declare @MissingProduct nvarchar(100);
	select top 1 @MissingProduct = Products.ProductName
	from CartItems 
	join Products on CartItems.ProductID = Products.ProductID
	where CartItems.UserID = @UserID 
		and Products.StockQuantity < CartItems.Quantity;
	
	if @MissingProduct is not null
	begin
		raiserror('Ошибка оформления: товара нет на складе - %s', 16, 1, @MissingProduct);
		rollback transaction;
		return;
	end;

	-- Получаем информацию о промокоде
	declare @PromoDiscountPercent int = null;
	declare @PromoIsGlobal bit = 0;
	declare @PromoCategoryID int = null;
	
	if @PromoID is not null
	begin
		select @PromoDiscountPercent = DiscountPercent,
			   @PromoIsGlobal = IsGlobal,
			   @PromoCategoryID = CategoryID
		from Promocodes
		where PromoID = @PromoID 
			and getdate() between ValidFrom and ValidTo;
	end;

	declare @OrderID int;
	insert into Orders (UserID, PromoID, StatusID)
	values (@UserID, @PromoID, (select StatusID from OrderStatuses where StatusCode = 'pending'));
	set @OrderID = scope_identity();

	-- Вставляем товары в заказ с учетом промокода (только для нужной категории или глобального)
	insert into OrderItems (OrderID, ProductID, Quantity, UnitPrice)
		select @OrderID, 
			   CartItems.ProductID, 
			   CartItems.Quantity, 
			   case 
				   when @PromoID is not null 
						and (@PromoIsGlobal = 1 or Products.CategoryID = @PromoCategoryID)
				   then dbo.func_GetDiscountedPrice(Products.Price, @PromoDiscountPercent)
				   else Products.Price
			   end as UnitPrice
		from CartItems 
		join Products on CartItems.ProductID = Products.ProductID
		where CartItems.UserID = @UserID;

	-- Уменьшаем количество товаров на складе
	update Products
	set StockQuantity = StockQuantity - CartItems.Quantity
	from Products
	join CartItems on Products.ProductID = CartItems.ProductID
	where CartItems.UserID = @UserID;
	
	delete from CartItems where UserID = @UserID;
  
  commit transaction;
end try
begin catch
	rollback transaction;
	print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure GetOrderDetails
	@UserID int,
    @OrderID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'User'
	)
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ', 16, 1);
		return;
	end;

	select
		Orders.OrderID,
        OrderStatuses.DisplayName AS Status,
        Products.ProductName,
        OrderItems.Quantity,
        OrderItems.UnitPrice,
        (OrderItems.Quantity * OrderItems.UnitPrice) AS LineTotal
	from Orders
	join OrderStatuses on Orders.StatusID = OrderStatuses.StatusID
	join OrderItems on Orders.OrderID = OrderItems.OrderID
	join Products on OrderItems.ProductID = Products.ProductID
	where Orders.UserID = @UserID and Orders.OrderID = @OrderID;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure GetUserOrders
	@UserID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'User'
	)
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ', 16, 1);
		return;
	end;

	select Orders.OrderID, sum(OrderItems.Quantity * OrderItems.UnitPrice) as TotalPrice, OrderStatuses.DisplayName
	from Orders join OrderStatuses on Orders.StatusID = OrderStatuses.StatusID
				join OrderItems on OrderItems.OrderID = Orders.OrderID
	where UserID = @UserID group by Orders.OrderID, OrderStatuses.DisplayName;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure GetCartItems
	@UserID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'User'
	)
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ', 16, 1);
		return;
	end;

	select
		CartItems.CartItemID,
		Products.ProductID,
        Products.ProductName,
        Products.Description,
        Categories.CategoryID,
        Categories.CategoryName,
        CartItems.Quantity,
        Products.Price,
        Products.StockQuantity,
        Products.ImageURL
	from CartItems
	join Products on CartItems.ProductID = Products.ProductID
	join Categories on Categories.CategoryID = Products.CategoryID
	where CartItems.UserID = @UserID;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure AddPromocode
	@UserID int,
	@Code nvarchar(100),
	@DiscountPercent int,
	@IsGlobal bit, 
	@CategoryID int,
	@ValidFrom datetime,
	@ValidTo datetime
as begin try
  begin transaction;

	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: только администратор может добавлять промокоды', 16, 1);
		return;
	end;

	if exists(
		select 1 from Promocodes where Code = @Code
	)
	begin
		raiserror('Данный промокод уже существует', 16, 1);
		return;
	end;

	insert into Promocodes(Code, DiscountPercent, IsGlobal, CategoryID, ValidFrom, ValidTo) 
		values (@Code, @DiscountPercent, @IsGlobal, @CategoryID, @ValidFrom, @ValidTo);

  commit transaction;
end try
begin catch
	rollback transaction;
	declare @ErrorMessage nvarchar(4000) = error_message();
	raiserror(@ErrorMessage, 16, 1);
end catch
go


create or alter procedure DeletePromocode
	@UserID int,
	@PromoID int
as begin try
  begin transaction;

	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: только администратор может удалять промокоды', 16, 1);
		return;
	end;

	if not exists(
		select 1 from Promocodes where PromoID = @PromoID
	)
	begin
		raiserror('Данный промокод не существует', 16, 1);
		return;
	end;

	-- Обновляем все заказы, которые используют этот промокод, устанавливая PromoID в NULL
	update Orders set PromoID = null where PromoID = @PromoID;

	delete from Promocodes where PromoID = @PromoID;

  commit transaction;
end try
begin catch
  rollback transaction;
  throw;
end catch

go


create or alter procedure GetPromocodes
as begin try
	select p.PromoID, p.Code, p.DiscountPercent, p.IsGlobal, c.CategoryName, p.ValidFrom, p.ValidTo 
	from Promocodes p
	left join Categories c on c.CategoryID = p.CategoryID;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure RegisterUserWithRole
	@AdminUserID int,
	@Username nvarchar(100),
	@PasswordHash nvarchar(250),
	@Email nvarchar(100),
	@RoleName nvarchar(50)
as begin try
  begin transaction;

	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @AdminUserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: только администратор может назначать роли', 16, 1);
		rollback transaction;
		return;
	end;
	
	declare @NewUserID int;

	insert into Users(Username, PasswordHash, Email) values (@Username, @PasswordHash, @Email);

	set @NewUserID = SCOPE_IDENTITY();

	insert into UserRoles (UserID, RoleID) values (@NewUserID, (
		select RoleID from Roles where RoleName = @RoleName));

  commit transaction;
end try
begin catch
	rollback transaction;
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure RegisterUser
	@Username nvarchar(100),
	@PasswordHash nvarchar(250),
	@Email nvarchar(100)
as begin try
  begin transaction;
	
	declare @NewUserID int;

	insert into Users(Username, PasswordHash, Email) values (@Username, @PasswordHash, @Email);

	set @NewUserID = SCOPE_IDENTITY();

	insert into UserRoles (UserID, RoleID) values (@NewUserID, (
		select RoleID from Roles where RoleName = 'User'));

  commit transaction;
end try
begin catch
	rollback transaction;
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure LoginUser
	@Username nvarchar(100),
	@PasswordHash nvarchar(250)
as begin try
	select u.UserID, u.Username, u.Email, r.RoleName
    from Users u
    join UserRoles ur on ur.UserID = u.UserID
    join Roles r on r.RoleID = ur.RoleID
    where u.Username = @Username and u.PasswordHash = @PasswordHash;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure GetCategories
as begin try
	select CategoryID, CategoryName from Categories order by CategoryName;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure GetCategoryIdByName
	@CategoryName nvarchar(200)
as begin try
	select CategoryID from Categories where CategoryName = @CategoryName;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure GetPromoIdByCode
	@Code nvarchar(100)
as begin try
	select PromoID, DiscountPercent from Promocodes
	where Code = @Code and getdate() between ValidFrom and ValidTo;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure UpsertCartItem
	@UserID int,
	@ProductID int,
	@QuantityDelta int
as begin try
	if not exists(
		select 1 from UserRoles ur join Roles r on r.RoleID = ur.RoleID
        where ur.UserID = @UserID and r.RoleName = 'User'
    )
	begin
		raiserror('Доступ запрещен: только авторизованный пользователь имеет доступ к корзине', 16, 1);
        return;
    end

	if exists (select 1 from CartItems where UserID = @UserID and ProductID = @ProductID)
        update CartItems
        set Quantity = Quantity + @QuantityDelta
        where UserID = @UserID and ProductID = @ProductID;
    else
		insert into CartItems(UserID, ProductID, Quantity) values (@UserID, @ProductID, @QuantityDelta);

	select CartItemID, UserID, ProductID, Quantity from CartItems
	where UserID = @UserID and ProductID = @ProductID;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure SetCartItemQuantity
	@UserID int,
    @ProductID int,
    @Quantity int
as begin try
    if not exists(
        select 1 from UserRoles ur join Roles r on r.RoleID = ur.RoleID
        where ur.UserID = @UserID and r.RoleName = 'User'
    )
    begin
        raiserror('Доступ запрещен', 16, 1);
        return;
    end

	if(@Quantity <= 0)
	begin
		delete from CartItems where UserID = @UserID and ProductID = @ProductID;
		return;
	end

	if exists(select 1 from CartItems where UserID = @UserID and ProductID = @ProductID)
		update CartItems set Quantity = @Quantity
		where UserID = @UserID and ProductID = @ProductID;
	else
		insert into CartItems(UserID, ProductID, Quantity) values(@UserID, @ProductID, @Quantity);
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure DeleteAccount
	@UserID int,
	@PasswordHash nvarchar(250) = null
as begin try
	begin transaction
	
	if(@PasswordHash is not null)
	begin
		if not exists(select 1 from Users where UserID = @UserID and PasswordHash = @PasswordHash)
		begin
			raiserror('Неверные учетные данные', 16, 1);
			rollback transaction;
			return;
		end
	end

	delete from Favorites where UserID = @UserID;
	delete from CartItems where UserID = @UserID;
	delete from UserRoles where UserID = @UserID;
	delete from OrderItems where OrderID in (select OrderID from Orders where UserID = @UserID);
	delete from Orders where UserID = @UserID
	delete from Users where UserID = @UserID;

	commit transaction;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure GetLogs
	@UserID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: доступ имеет только администратор', 16, 1);
		return;
	end;

	select * from Logs;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure DeleteLogs
	@UserID int
as begin try
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: доступ имеет только администратор', 16, 1);
		return;
	end;

	delete from Logs;
end try
begin catch
	print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure GetProductsPaged
	@PageNumber int,
	@PageSize int
as begin try
	if @PageNumber is null or @PageNumber < 1 set @PageNumber = 1;
    if @PageSize is null or @PageSize < 1 set @PageSize = 52;

	select 
		p.ProductID,
        p.ProductName,
        p.Description,
        p.CategoryID,
        c.CategoryName,
        p.Price,
        dbo.func_GetDiscountedPrice(p.Price, pr.DiscountPercent) as DiscountedPrice,
        p.StockQuantity,
        p.ImageURL
	from Products p
	join Categories c on p.CategoryID = c.CategoryID
	left join Promocodes pr on pr.CategoryID = p.CategoryID and getdate() between pr.ValidFrom and pr.ValidTo
	order by p.ProductID
	offset (@PageNumber - 1) * @PageSize rows
	fetch next @PageSize rows only;
end try
begin catch
	print 'Ошибка: ' + error_message();

end catch
go

