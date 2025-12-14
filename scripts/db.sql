use master;
go


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
