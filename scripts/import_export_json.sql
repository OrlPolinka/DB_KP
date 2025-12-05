------------------------------------------------------- Экспорт -------------------------------------------------------

create or alter procedure ExportProductsToJSON
as
begin try
    begin transaction
        set nocount on;

        select
            P.ProductID,
            P.ProductName,
            P.Description,
            P.Price,
            P.StockQuantity,
            P.ImageURL,
            C.CategoryID,
            C.CategoryName
        from Products P
        join Categories C on C.CategoryID = P.CategoryID
        for json path;

        commit transaction;
end try
begin catch
    rollback transaction;
    print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure ExportPromocodesToJSON
as
begin try
    begin transaction
        set nocount on;

        select
            PromoID,
            Code,
            DiscountPercent,
            IsGlobal,
            CategoryID,
            ValidFrom,
            ValidTo
        from Promocodes
        for json path;

        commit transaction;
end try
begin catch
    rollback transaction;
    print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure ExportLogsToJSON
as begin try
	set nocount on;

	select LogID, UserID, Action, Timestamp from Logs order by LogID desc for json path;
end try
begin catch
    rollback transaction;
    print 'Ошибка: ' + error_message();
end catch
go


-- sqlcmd -S localhost -d OnlineClothingShop -Q "EXEC ExportLogsToJSON" -o "C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\Logs.json" -h -1 -r 1 -y 8000


-- Пример вызова для записи в файл через sqlcmd:
-- sqlcmd -S localhost -d OnlineClothingShop -Q "EXEC ExportProductsToJSON" -o "C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\Products.json" -h -1 -r 1 -y 8000

exec ExportProductsToJSON;
exec ExportPromocodesToJSON;
go

------------------------------------------------------- Импорт -------------------------------------------------------

create or alter procedure ImportProductsFromJSON
as
begin try
    begin transaction
        declare @json nvarchar(max);

        select @json = BulkColumn
        from openrowset(bulk 'C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\Products.json', single_clob) as j;

        insert into Products(ProductName, Description, CategoryID, Price, StockQuantity, ImageURL)
        select ProductName, Description, CategoryID, Price, StockQuantity, ImageURL
        from openjson(@json)
        with (
            ProductName nvarchar(100),
            Description nvarchar(max),
            CategoryID int,
            Price decimal(10, 2),
            StockQuantity int,
            ImageURL nvarchar(500)
        );

        commit transaction;
end try
begin catch
    rollback transaction;
    print 'Ошибка: ' + error_message();
end catch
go

create or alter procedure ImportPromocodesFromJSON
as
begin try
    begin transaction
        declare @json nvarchar(max);

        select @json = BulkColumn
        from openrowset(bulk 'C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\Promocodes.json', single_clob) as j;

        insert into Promocodes(Code, DiscountPercent, IsGlobal, CategoryID, ValidFrom, ValidTo)
        select Code, DiscountPercent, IsGlobal, CategoryID, ValidFrom, ValidTo
        from openjson(@json)
        with (
            Code nvarchar(100),
            DiscountPercent int,
            IsGlobal bit,
            CategoryID int,
            ValidFrom datetime,
            ValidTo datetime
        );

        commit transaction;
end try
begin catch
    rollback transaction;
    print 'Ошибка: ' + error_message();
end catch
go


create or alter procedure ImportLogsFromJSON
as begin try
	begin transaction

	declare @json nvarchar(max);
	select @json = BulkColumn from openrowset(bulk 'C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\Logs.json', single_clob) as j;

	insert into Logs(UserID, Action, Timestamp)
	select UserID, Action, Timestamp from openjson(@json)
	with (UserID int,
		Action nvarchar(250),
		Timestamp datetime
	);

	commit transaction;
end try
begin catch
    rollback transaction;
    print 'Ошибка: ' + error_message();
end catch
go


------------------------------------------------------- Тест вызова -------------------------------------------------------

exec ImportProductsFromJSON;
exec ImportPromocodesFromJSON;
go


