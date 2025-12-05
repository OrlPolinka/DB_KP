
create unique index Ind_Users_Username on Users(Username);
create unique index Ind_Users_Email on Users(Email);
create index Ind_UserRoles_UserID on UserRoles(UserID);
create index Ind_UserRoles_RoleID on UserRoles(RoleID);
create unique index Ind_UserRoles_UserRole on UserRoles(UserID, RoleID);
create index Ind_Products_CategoryID on Products(CategoryID);
create index Ind_Products_ProductName on Products(ProductName);
create index Ind_Favorites_UserID on Favorites(UserID);
create index Ind_Favorites_ProductID on Favorites(ProductID);
create index Ind_CartItems_UserID on CartItems(UserID);
create index Ind_CartItems_ProductID on CartItems(ProductID);
create unique index Ind_CartItems_UserProduct on CartItems(UserID, ProductID);
create index Ind_Orders_UserID on Orders(UserID);
create index Ind_Orders_StatusID on Orders(StatusID);
create index Ind_OrderItems_OrderID on OrderItems(OrderID);
create index Ind_OrderItems_ProductID on OrderItems(ProductID);
create unique index Ind_Promocodes_Code on Promocodes(Code);
