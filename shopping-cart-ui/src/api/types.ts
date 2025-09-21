export enum ProductCategory {
  Accessories = 'Accessories',
  Hardware = 'Hardware',
  Software = 'Software',
  Books = 'Books',
  Movies = 'Movies',
  Music = 'Music',
  Games = 'Games',
  Other = 'Other',
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  quantity: number;
  unitPrice: number;
  detailsUrl: string;
  imageUrl: string;
}

export interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  total: number;
}
