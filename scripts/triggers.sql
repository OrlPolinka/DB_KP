
create trigger trig_Products on Products after insert, update, delete
as declare @UserID int,
		   @ins int = (select count(*) from inserted),
		   @del int = (select count(*) from deleted),
		   @info nvarchar(500);
begin
	select @UserID = cast(substring(context_info(), 1, 4) as int);
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: только администратор имеет доступ к изменению товаров', 16, 1);
		rollback transaction;
		return;
	end;

	-- insert
	if @ins > 0 and @del = 0
	begin
		select top 1 @info = ProductName + ' ' + cast(price as nvarchar(20)) + ' ' + cast(StockQuantity as nvarchar(20)) from inserted;
		insert into Logs(UserID, Action) values (@UserID, 'Добавлен товар: ' + @info);
	end;

	--delete
	if @ins = 0 and @del > 0
	begin
		select top 1 @info = ProductName + ' ' + cast(price as nvarchar(20)) + ' ' + cast(StockQuantity as nvarchar(20)) from deleted;
		insert into Logs(UserID, Action) values (@UserID, 'Удален товар: ' + @info);
	end;

	--update
	if @ins > 0 and @del > 0
	begin
		declare
			@old nvarchar(300), @new nvarchar(300);

		select top 1 @new = ProductName + ' ' + cast(price as nvarchar(20)) + ' ' + cast(StockQuantity as nvarchar(20)) from inserted;
		select top 1 @old = ProductName + ' ' + cast(price as nvarchar(20)) + ' ' + cast(StockQuantity as nvarchar(20)) from deleted;

		insert into Logs(UserID, Action) values (@UserID, 'Обновлен товар: ' + @old + ' -> ' + @new);
	end;
end;
go



create trigger trig_Promocodes on Promocodes after insert, delete
as declare @UserID int,
		   @ins int = (select count(*) from inserted),
		   @del int = (select count(*) from deleted),
		   @info nvarchar(500);
begin
	select @UserID = cast(substring(context_info(), 1, 4) as int);
	if not exists(
		select 1 from UserRoles join Roles on Roles.RoleID = UserRoles.RoleID 
		where UserRoles.UserID = @UserID and Roles.RoleName = 'Admin'
	)
	begin
		raiserror('Доступ запрещен: только администратор имеет доступ к изменению товаров', 16, 1);
		rollback transaction;
		return;
	end;

	-- insert
	if @ins > 0 and @del = 0
	begin
		select top 1 @info = Code + ' ' + cast(DiscountPercent as nvarchar(20)) + '%' from inserted;
		insert into Logs(UserID, Action) values (@UserID, 'Добавлен промокод: ' + @info);
	end;

	--delete
	if @ins = 0 and @del > 0
	begin
		select top 1 @info = Code + ' ' + cast(DiscountPercent as nvarchar(20)) + '%' from deleted;
		insert into Logs(UserID, Action) values (@UserID, 'Удален промокод: ' + @info);
	end;
end;
go