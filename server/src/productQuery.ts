export const PRODUCT_SELECT = `
SELECT p.*,
  c.slug AS category_slug, c.name AS category_name, c.icon AS category_icon,
  (SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id) AS rating,
  (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count,
  (SELECT COALESCE(SUM(oi.qty), 0) FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = p.id AND o.status != 'cancelled') AS sold
FROM products p
JOIN categories c ON c.id = p.category_id
`;

export function mapProduct(row: any) {
  let specs: Record<string, string> = {};
  try {
    specs = JSON.parse(row.specs || '{}');
  } catch {
    /* оставяме празно */
  }
  return {
    id: row.id as number,
    slug: row.slug as string,
    name: row.name as string,
    brand: row.brand as string,
    description: row.description as string,
    price: row.price as number,
    oldPrice: (row.old_price as number | null) ?? null,
    stock: row.stock as number,
    imageUrl: (row.image_url as string | null) ?? null,
    specs,
    featured: !!row.featured,
    createdAt: row.created_at as string,
    category: { id: row.category_id, slug: row.category_slug, name: row.category_name, icon: row.category_icon },
    rating: (row.rating as number | null) ?? null,
    reviewCount: row.review_count as number,
    sold: row.sold as number,
  };
}
