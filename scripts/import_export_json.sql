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


-- sqlcmd -S localhost -d OnlineClothingShop -Q "EXEC ExportLogsToJSON" -o "C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\json\Logs.json" -h -1 -r 1 -y 8000


------------------------------------------------------- Импорт -------------------------------------------------------

create or alter procedure ImportLogsFromJSON
as begin try
	begin transaction

	declare @json nvarchar(max);
	select @json = BulkColumn from openrowset(bulk 'C:\Users\user\Desktop\лк, экз\бд\3 курс\кп\DB_KP\json\Logs.json', single_clob) as j;

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





