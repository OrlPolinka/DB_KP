
create function func_GetDiscountedPrice
(
	@Price decimal(10, 2),
	@DiscountPercent int
)
returns decimal(10, 2)
as begin
	declare @DiscountedPrice decimal(10, 2);

	if @DiscountPercent is null or @DiscountPercent = 0
		set @DiscountedPrice = @Price;
	else set @DiscountedPrice = @Price - (@Price * @DiscountPercent / 100);

	return @DiscountedPrice;
end;