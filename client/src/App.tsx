import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CookieBanner } from './components/CookieBanner';
import { EmptyState, Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductPage } from './pages/ProductPage';
import { Cart } from './pages/Cart';
import { Favorites } from './pages/Favorites';
import { Checkout } from './pages/Checkout';
import { OrderSuccess } from './pages/OrderSuccess';
import { AuthPage } from './pages/AuthPage';
import { Account } from './pages/Account';
import { Admin } from './pages/Admin';
import { AdminLogin } from './pages/AdminLogin';
import { CookiesPage, PrivacyPage } from './pages/Legal';
import { useScrollReveal } from './useScrollReveal';
import { Ghost } from 'lucide-react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="container page"><Spinner /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return <>{children}</>;
}

/** /admin показва скрития вход, докато не влезе администратор. */
function AdminGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="container page"><Spinner /></div>;
  return user?.role === 'admin' ? <Admin /> : <AdminLogin />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  useScrollReveal();
  return (
    <div className="app">
      <div className="bg-orbs" aria-hidden>
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order/:id" element={<OrderSuccess />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/admin" element={<AdminGate />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route
            path="*"
            element={
              <div className="container page">
                <EmptyState icon={<Ghost size={30} />} title="Страницата не е намерена">
                  <Link to="/" className="btn btn-primary">Към началото</Link>
                </EmptyState>
              </div>
            }
          />
        </Routes>
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
