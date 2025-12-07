export type Product = {
  ProductID: number;
  ProductName: string;
  Description: string;
  CategoryID?: number;
  CategoryName?: string;
  Price: number;
  DiscountedPrice?: number;
  StockQuantity: number;
  ImageURL?: string;
};

export type Category = {
  CategoryID: number;
  CategoryName: string;
};

export type CartItem = {
  CartItemID: number;
  ProductID: number;
  ProductName: string;
  Description: string;
  CategoryID?: number;
  CategoryName: string;
  Quantity: number;
  Price: number;
  StockQuantity?: number;
  DiscountedPrice?: number;
  DiscountPercent?: number;
  ImageURL?: string;
};

export type Promocode = {
  PromoID: number;
  Code: string;
  DiscountPercent: number;
  IsGlobal: boolean;
  CategoryName?: string;
  ValidFrom?: string;
  ValidTo?: string;
};

export type OrderSummary = {
  OrderID: number;
  TotalPrice: number;
  DisplayName: string;
};

export type OrderDetail = {
  OrderID: number;
  Status: string;
  ProductName: string;
  Quantity: number;
  UnitPrice: number;
  LineTotal: number;
};

export type LogRow = {
  LogID: number;
  UserID: number;
  Action: string;
  Timestamp: string;
};
