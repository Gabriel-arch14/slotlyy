import { Link } from 'react-router-dom';

/** Логото на Slotlyy — знакът „S“ + надписът, от официалния файл с логото. */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' | 'xl' }) {
  return (
    <Link to="/" className={`logo logo-${size}`} aria-label="Slotlyy — начало">
      <img src="/brand/logo-mark.png" alt="" className="logo-mark" />
      <img src="/brand/logo-wordmark.png" alt="Slotlyy" className="logo-word" />
    </Link>
  );
}
