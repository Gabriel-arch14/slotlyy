import { useState, type ReactNode } from 'react';
import { Minus, Plus, Star } from 'lucide-react';
import { IconBadge } from './icons';

export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  const v = Math.round(value ?? 0);
  return (
    <span className="stars" aria-label={value ? `Оценка ${value} от 5` : 'Без оценка'}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= v ? 'star on' : 'star'} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="stars stars-picker" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          type="button"
          key={i}
          className={i <= (hover || value) ? 'star on' : 'star'}
          onMouseEnter={() => setHover(i)}
          onClick={() => onChange(i)}
          aria-label={`${i} звезди`}
        >
          <Star size={26} fill="currentColor" strokeWidth={0} />
        </button>
      ))}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
    </div>
  );
}

export function QtyInput({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="qty">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Намали"><Minus size={16} /></button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Увеличи"><Plus size={16} /></button>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <IconBadge size="lg">{icon}</IconBadge>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
