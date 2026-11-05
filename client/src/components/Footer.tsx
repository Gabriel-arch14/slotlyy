import { Link } from 'react-router-dom';
import { Clock, Mail, Phone, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p className="muted">Gaming Tech Store — всичко за твоя сетъп, от мишката до стола. Бърза доставка в цяла България.</p>
        </div>
        <div>
          <h4>Магазин</h4>
          <Link to="/catalog">Всички продукти</Link>
          <Link to="/catalog?sale=1">Промоции</Link>
          <Link to="/catalog?sort=newest">Нови продукти</Link>
        </div>
        <div>
          <h4>Помощ</h4>
          <span className="with-icon"><Truck size={15} /> Доставка 1–3 работни дни</span>
          <span className="with-icon"><RotateCcw size={15} /> Връщане до 14 дни</span>
          <span className="with-icon"><ShieldCheck size={15} /> Гаранция 2 години</span>
          <Link to="/cookies">Бисквитки</Link>
          <Link to="/privacy">Лични данни</Link>
        </div>
        <div>
          <h4>Контакти</h4>
          <span className="with-icon"><Phone size={15} /> 0888 123 456</span>
          <span className="with-icon"><Mail size={15} /> support@slotlyy.bg</span>
          <span className="with-icon"><Clock size={15} /> Пон–Пет, 9:00–18:00</span>
        </div>
      </div>
      <div className="container footer-bottom muted small">© {new Date().getFullYear()} Slotlyy. Всички права запазени.</div>
    </footer>
  );
}
