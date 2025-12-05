use master;
go

DECLARE @kill varchar(8000) = '';

SELECT @kill = @kill + 'KILL ' + CONVERT(varchar(5), session_id) + ';'
FROM sys.dm_exec_sessions
WHERE database_id = DB_ID('OnlineClothingShop');

EXEC(@kill);


drop database OnlineClothingShop;

create database OnlineClothingShop
on primary (
    name = OnlineClothingShop,
    filename = 'C:\SQLData\OnlineClothingShop.mdf',
    size = 200MB,
    filegrowth = 64MB
)
log on (
    name = OnlineClothingShop_log,
    filename = 'C:\SQLData\OnlineClothingShop_log.ldf',
    size = 100MB,
    filegrowth = 64MB
);
