create or alter trigger trig_Products 
on Products 
after insert, update, delete
as
declare 
    @UserID int,
    @ins int = (select count(*) from inserted),
    @del int = (select count(*) from deleted),
    @info nvarchar(500);
begin
    select @UserID = cast(substring(context_info(), 1, 4) as int);

    if @UserID is null return;

    if @ins > 0 and @del = 0
    begin
        select top 1 @info = ProductName + ' ' + cast(price as nvarchar(20)) + ' ' + cast(StockQuantity as nvarchar(20)) 
        from inserted;
        insert into Logs(UserID, Action) values (@UserID, 'Insert product: ' + @info);
    end;

    if @ins = 0 and @del > 0
    begin
        select top 1 @info = ProductName + ' ' + cast(price as nvarchar(20)) + ' ' + cast(StockQuantity as nvarchar(20)) 
        from deleted;
        insert into Logs(UserID, Action) values (@UserID, 'Delete product: ' + @info);
    end;

    if @ins > 0 and @del > 0
    begin
        declare @old nvarchar(300), @new nvarchar(300);

        select top 1 @new = ProductName + ' ' + cast(price as nvarchar(20)) + ' ' + cast(StockQuantity as nvarchar(20)) 
        from inserted;
        select top 1 @old = ProductName + ' ' + cast(price as nvarchar(20)) + ' ' + cast(StockQuantity as nvarchar(20)) 
        from deleted;

        insert into Logs(UserID, Action) values (@UserID, 'Update product: ' + @old + ' -> ' + @new);
    end;
end;
go


create or alter trigger trig_Promocodes 
on Promocodes 
after insert, delete
as
declare 
    @UserID int,
    @ins int = (select count(*) from inserted),
    @del int = (select count(*) from deleted),
    @info nvarchar(500);
begin
    select @UserID = cast(substring(context_info(), 1, 4) as int);

    if @UserID is null return;

    if @ins > 0 and @del = 0
    begin
        select top 1 @info = Code + ' ' + cast(DiscountPercent as nvarchar(20)) + '%' 
        from inserted;
        insert into Logs(UserID, Action) values (@UserID, 'Insert promocode: ' + @info);
    end;

    if @ins = 0 and @del > 0
    begin
        select top 1 @info = Code + ' ' + cast(DiscountPercent as nvarchar(20)) + '%' 
        from deleted;
        insert into Logs(UserID, Action) values (@UserID, 'Delete promocode: ' + @info);
    end;
end;
go
