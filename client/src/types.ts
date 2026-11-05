export type Category = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  description?: string;
  productCount?: number;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  imageUrl: string | null;
  specs: Record<string, string>;
  featured: boolean;
  createdAt: string;
  category: Category;
  rating: number | null;
  reviewCount: number;
  sold: number;
};

export type Review = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  userName: string;
  userId: number;
};

export type ProductList = { items: Product[]; total: number; page: number; pages: number };

export type User = { id: number; name: string; email: string; role: 'customer' | 'admin' };

export type OrderStatus = 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type Order = {
  id: number;
  userId: number | null;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  note: string;
  paymentMethod: 'cod' | 'card' | 'bank';
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode: string | null;
  createdAt: string;
  items: { productId: number | null; slug: string | null; name: string; price: number; qty: number }[];
};

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  brand: string;
  price: number;
  qty: number;
  stock: number;
  imageUrl: string | null;
  categorySlug?: string;
};
