------------------------------------------------------- Экспорт -------------------------------------------------------

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

create or alter procedure ExportProductsToJSON
as begin try
	set nocount on;

	select  ProductID,
			ProductName,
			Description,
			CategoryID,
			Price,
			StockQuantity,
			-- для URL оставляем '/', для файловых путей меняем '/' -> '\'
            replace(
                replace(
                    replace(
                        case
                            when ImageUrl like 'http://%' or ImageUrl like 'https://%' then ImageUrl
                            else replace(ImageUrl, '/', '\')  -- нормализуем к обратным слэшам
                        end,
                        char(13), ''),  -- убираем CR
                    char(10), ''),    -- убираем LF
                char(9), ''          -- убираем TAB
            ) as ImageUrl
	from Products
	order by ProductID desc
	for json path;
end try
begin catch
    rollback transaction;
    print 'Ошибка: ' + error_message();
end catch
go


-- sqlcmd -S localhost -d OnlineClothingShop -Q "EXEC ExportLogsToJSON" -o "C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\json\Logs.json" -h -1 -r 1 -y 8000


------------------------------------------------------- Импорт -------------------------------------------------------

create or alter procedure ImportLogsFromJSON
	@JsonData nvarchar(MAX)
as begin try
	begin transaction

	insert into Logs(UserID, Action, Timestamp)
	select UserID, Action, Timestamp from openjson(@JsonData)
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

create or alter procedure ImportProductsFromJSON
	@JsonData nvarchar(max)
as begin try
	begin transaction;

	insert into Products(ProductName, Description, CategoryID, Price, StockQuantity, ImageURL)
	select  ProductName,
			Description,
			CategoryID,
			Price,
			StockQuantity,
			ImageURL
	from openjson(@JsonData)
	with (
		ProductName nvarchar(250),
		Description nvarchar(max),
		CategoryID int,
		Price decimal(18, 2),
		StockQuantity int,
		ImageURL nvarchar(500)
	)
	where ProductName is not null;

	commit transaction;
end try
begin catch
    rollback transaction;
    print 'Ошибка: ' + error_message();
end catch
go