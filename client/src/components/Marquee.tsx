import { Link } from 'react-router-dom';
import { CategoryIcon } from './icons';

const WORDS = [
  { label: 'Мишки', slug: 'mishki' },
  { label: 'Клавиатури', slug: 'klaviaturi' },
  { label: 'Столове', slug: 'stolove' },
  { label: 'Падове', slug: 'podlozhki' },
  { label: 'Монитори', slug: 'monitori' },
  { label: 'Микрофони', slug: 'mikrofoni' },
];

/** Безкрайна движеща се лента с категориите. Съдържанието е дублирано, за да се върти без прекъсване. */
export function Marquee() {
  // Повтаряме думите, за да е лентата по-широка от екрана.
  const items = [...WORDS, ...WORDS];
  const group = (hidden: boolean) => (
    <div className="marquee-group" aria-hidden={hidden || undefined}>
      {items.map((w, i) => (
        <Link key={i} to={`/catalog?category=${w.slug}`} className="marquee-item" tabIndex={hidden ? -1 : undefined}>
          <CategoryIcon slug={w.slug} size={26} /> {w.label}
          <span className="marquee-sep" aria-hidden>✦</span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="marquee" role="region" aria-label="Категории продукти">
      <div className="marquee-track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}
