create view vw_top100Products
as select top 100 
	Products.ProductID, Products.ProductName, 
	Categories.CategoryName,
	sum(OrderItems.Quantity) as TotalSold,
	sum(OrderItems.Quantity * OrderItems.UnitPrice) as TotalRevenue
from OrderItems 
join Products on OrderItems.ProductID = Products.ProductID
join Categories on Categories.CategoryID = Products.CategoryID
group by Products.ProductID, Products.ProductName, Categories.CategoryName
order by TotalSold desc;