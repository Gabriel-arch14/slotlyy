import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { readCookie } from '../api';

const CONSENT_COOKIE = 'slotlyy_consent';
const YEAR_SECONDS = 365 * 24 * 60 * 60;

function hasConsent() {
  try {
    return readCookie(CONSENT_COOKIE) === '1';
  } catch {
    return false;
  }
}

/** Уведомление за бисквитките при първо влизане. Остава, докато клиентът не натисне „Съгласен съм“. */
export function CookieBanner() {
  const [visible, setVisible] = useState(() => !hasConsent());
  if (!visible) return null;

  const accept = () => {
    document.cookie = `${CONSENT_COOKIE}=1; Path=/; Max-Age=${YEAR_SECONDS}; SameSite=Lax`;
    setVisible(false);
  };

  return (
    <div className="cookie-banner glass" role="dialog" aria-live="polite" aria-label="Бисквитки">
      <div className="cookie-banner-text">
        <strong className="with-icon"><Cookie size={18} /> Използваме бисквитки</strong>
        <p className="muted small">
          Само необходимите, за да работи магазинът: <b>вход в профила</b> (да не въвеждате паролата на всяка страница),
          <b> количката</b> (продуктите остават, докато разглеждате) и <b>сигурност</b> (защита от фалшиви заявки и измами).
          Не използваме рекламни или проследяващи бисквитки.
        </p>
      </div>
      <div className="cookie-banner-actions">
        <Link to="/cookies" className="btn btn-outline btn-sm">Бисквитки</Link>
        <Link to="/privacy" className="btn btn-outline btn-sm">Лични данни</Link>
        <button className="btn btn-primary btn-sm" onClick={accept}>Съгласен съм</button>
      </div>
    </div>
  );
}
