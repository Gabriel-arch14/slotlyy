import type { OrderStatus } from './types';

const money = new Intl.NumberFormat('bg-BG', { style: 'currency', currency: 'EUR' });
export const formatPrice = (n: number) => money.format(n);

export const formatDate = (iso: string) =>
  new Date(iso.replace(' ', 'T') + (iso.endsWith('Z') ? '' : 'Z')).toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Нова',
  processing: 'Обработва се',
  shipped: 'Изпратена',
  delivered: 'Доставена',
  cancelled: 'Отказана',
};

export const PAYMENT_LABELS: Record<string, string> = {
  cod: 'Наложен платеж',
  card: 'Карта (демо)',
  bank: 'Банков превод',
};

export const discountPercent = (price: number, oldPrice: number | null) =>
  oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

export const FREE_SHIPPING_FROM = 100;
export const SHIPPING_PRICE = 5.99;
