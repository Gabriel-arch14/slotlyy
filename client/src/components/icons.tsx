import {
  Armchair, Gamepad2, Headphones, Keyboard, Mic, Monitor, Mouse, Package, RectangleHorizontal, type LucideIcon,
} from 'lucide-react';

/** Иконите на категориите — по slug, за да не зависят от данните в базата. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  mishki: Mouse,
  klaviaturi: Keyboard,
  slushalki: Headphones,
  monitori: Monitor,
  stolove: Armchair,
  podlozhki: RectangleHorizontal,
  kontroleri: Gamepad2,
  mikrofoni: Mic,
};

export function CategoryIcon({ slug, size = 18, strokeWidth = 1.75, className }: { slug?: string | null; size?: number; strokeWidth?: number; className?: string }) {
  const Icon = (slug && CATEGORY_ICONS[slug]) || Package;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}

/** Иконка в стъклен „чип“ с градиентна рамка — за категории, празни състояния и т.н. */
export function IconBadge({ children, size = 'md' }: { children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`icon-badge icon-badge-${size}`}>{children}</span>;
}
