import { useState } from 'react';
import { CategoryIcon } from './icons';

type Props = { id: number; name: string; brand: string; category?: string | null; imageUrl: string | null; size?: 'sm' | 'md' | 'lg' };

/** Показва снимката на продукта; ако няма или не се зареди — стилизирана корица с иконата на категорията. */
export function ProductImage({ id, name, brand, category, imageUrl, size = 'md' }: Props) {
  const [failed, setFailed] = useState(false);

  if (imageUrl && !failed) {
    return (
      <div className={`pimg pimg-${size}`}>
        <img src={imageUrl} alt={name} loading="lazy" onError={() => setFailed(true)} />
      </div>
    );
  }
  const shift = (id * 23) % 40;
  return (
    <div
      className={`pimg pimg-${size} pimg-generated`}
      style={{
        background: `radial-gradient(circle at 30% 20%, hsl(${185 + shift} 90% 50% / .35), transparent 60%),
                     radial-gradient(circle at 80% 90%, hsl(${215 + shift} 85% 55% / .3), transparent 55%),
                     linear-gradient(135deg, #0c1420, #070b12)`,
      }}
      role="img"
      aria-label={name}
    >
      <CategoryIcon slug={category} size={size === 'sm' ? 22 : size === 'lg' ? 120 : 56} strokeWidth={size === 'sm' ? 1.75 : 1.25} className="pimg-icon" />
      {size !== 'sm' && <span className="pimg-brand">{brand}</span>}
    </div>
  );
}
