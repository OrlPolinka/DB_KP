create or alter view vw_top100Products
as
select top 100 
    p.ProductID,
    p.ProductName,
    p.Description,
    p.ImageURL,
    p.Price,
    p.StockQuantity,
    c.CategoryName,
    sum(oi.Quantity) as TotalSold,
    sum(oi.Quantity * oi.UnitPrice) as TotalRevenue
from OrderItems oi
join Products p on oi.ProductID = p.ProductID
join Categories c on c.CategoryID = p.CategoryID
group by 
    p.ProductID, p.ProductName, p.Description, p.ImageURL, p.Price, p.StockQuantity, c.CategoryName
order by TotalSold desc;