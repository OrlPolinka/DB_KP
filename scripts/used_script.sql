------------------------------------------------------- Admin -------------------------------------------------
declare @UserID int;
select @UserID = Users.UserID from Users join UserRoles on UserRoles.UserID = Users.UserID
									join Roles on Roles.RoleID = UserRoles.RoleID where Roles.RoleName = 'Admin';

declare @bin varbinary(4);
select @bin = cast(@UserID as varbinary(4));
set context_info @bin;


------------------------------------------
exec AddProduct 
    @UserID = 1,
    @ProductName = 'New Jacket',
    @Description = 'Warm winter jacket',
    @CategoryID = 1,
    @Price = 199.99,
    @StockQuantity = 50,
    @ImageURL = 'C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\images\Jacket.jpg';

exec GetProducts;


-----------------------------------
exec UpdateProduct 
    @UserID = 1,
    @ProductID = 12,
    @ProductName = 'Updated Jacket',
    @Description = 'Updated description',
    @CategoryID = 2,
    @Price = 179.99,
    @StockQuantity = 40,
    @ImageURL = 'C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\images\jacket_new.jpg';

exec GetProducts;


-----------------------------------
exec DeleteProduct @UserID = 1, @ProductID = 11;

exec GetProducts;

-----------------------------------
declare @ValidTo datetime = dateadd(day, 30, getdate()),
		@ValidFrom datetime = getdate();

exec AddPromocode 
    @UserID = 1,
    @Code = 'WINTER50',
    @DiscountPercent = 50,
    @IsGlobal = 1,
    @CategoryID = null,
    @ValidFrom = @ValidFrom,
    @ValidTo = @ValidTo;


exec GetPromocodes;

-----------------------------------
exec DeletePromocode @UserID = 1, @PromoID = 32;

exec GetPromocodes;

-----------------------------------
exec RegisterUserWithRole 
    @AdminUserID = 1,
    @Username = 'NewUsr',
    @PasswordHash = 'has_new',
    @Email = 'newuse@gmail.com',
    @RoleName = 'User';

exec LoginUser @Username = 'NewUsr', @PasswordHash = 'has_new';

go
--------------------------------------------- User --------------------------------------------------------
declare @UserID int;
select @UserID = UserID from Users where UserID = 2;

declare @bin varbinary(4);
select @bin = cast(@UserID as varbinary(4));
set context_info @bin;

------------------------------------------
exec SearchProducts @Keyword = 'Jacket';
exec GetProductDetails @ProductId = 9;
exec FilterSearchProducts @CategoryID = 1;

exec GetCategories;
exec GetCategoryIdByName @CategoryName = 'Category_1';

exec AddToFavorites @UserID = 2, @ProductID = 9;
exec DeleteFromFavorites @UserID = 2, @ProductID = 9;
exec GetFavorites @UserID = 2;

exec UpsertCartItem @UserID = 2, @ProductID = 9, @QuantityDelta = 2;
exec UpsertCartItem @UserID = 2, @ProductID = 10, @QuantityDelta = 3;
exec DeleteFromCart @UserID = 2, @ProductID = 9;
exec GetCartItems @UserID = 2;

exec CreateOrder @UserID = 2, @PromoID = null;
exec GetUserOrders @UserID = 2;
exec GetOrderDetails @UserID = 2, @OrderID = 5;

exec GetPromocodes;

exec GetTop100Products;

exec GetProducts;

exec RegisterUser 
    @Username = 'SimpleUse',
    @PasswordHash = 'hash_simple',
    @Email = 'simpleuse@gmail.com';

exec LoginUser @Username = 'SimpleUse', @PasswordHash = 'hash_simple';

exec DeleteAccount @UserID = 9, @PasswordHash = 'hash_simple';

go

------------------------------------------------------- Admin -------------------------------------------------
declare @UserID int;
select @UserID = Users.UserID from Users join UserRoles on UserRoles.UserID = Users.UserID
									join Roles on Roles.RoleID = UserRoles.RoleID where Roles.RoleName = 'Admin';

declare @bin varbinary(4);
select @bin = cast(@UserID as varbinary(4));
set context_info @bin;

------------------------------------------------------- Импорт / Экспорт -------------------------------------------------

exec ExportLogsToJSON;


-- sqlcmd -S localhost -d OnlineClothingShop -Q "EXEC ExportLogsToJSON" -o "C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\Logs.json" -h -1 -r 1 -y 8000

exec GetLogs @UserID = 1;
exec DeleteLogs @UserID = 1;


exec ImportLogsFromJSON;
