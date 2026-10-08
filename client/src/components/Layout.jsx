import { Link, NavLink, Outlet } from 'react-router-dom';
import Icon from './Icon.jsx';
import SearchBox from './SearchBox.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { SHOP } from '../format.js';

function Logo() {
  return (
    <Link to="/" className="logo" aria-label="KhangShop - Trang chủ">
      <span className="logo-mark" aria-hidden="true">K</span>
      <span className="logo-text">{SHOP.name}</span>
    </Link>
  );
}

function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const categories = useApi('/categories');

  return (
    <>
      <div className="announce">GIAO HÀNG TOÀN QUỐC • THANH TOÁN KHI NHẬN HÀNG • ĐỔI TRẢ TRONG 7 NGÀY</div>
      <header className="site-header">
        <div className="container header-inner">
          <Logo />
          <SearchBox />
          <nav className="header-actions" aria-label="Tài khoản và giỏ hàng">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link to="/quan-tri" className="header-link">
                    <Icon name="grid" /> Quản trị
                  </Link>
                )}
                <Link to="/tai-khoan/don-hang" className="header-link">
                  <Icon name="user" size={22} /> {user.fullName.split(' ').pop()}
                </Link>
                <button type="button" className="link-btn" onClick={logout} style={{ fontSize: 14 }}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/dang-nhap" className="header-link">
                <Icon name="user" size={22} /> Đăng nhập
              </Link>
            )}
            <Link to="/gio-hang" className="btn btn-shadow" aria-label={`Giỏ hàng, ${count} sản phẩm`}>
              <Icon name="cart" />
              <span>Giỏ hàng</span>
              <span className="badge">{count}</span>
            </Link>
          </nav>
        </div>
      </header>
      {categories.data && (
        <nav className="container cat-nav" aria-label="Danh mục sản phẩm">
          <NavLink to="/san-pham" end className={({ isActive }) => `pill${isActive ? ' is-active' : ''}`}>
            Tất cả
          </NavLink>
          {categories.data.map((c) => (
            <NavLink key={c.id} to={`/danh-muc/${c.slug}`} className={({ isActive }) => `pill${isActive ? ' is-active' : ''}`}>
              {c.name}
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="stack" style={{ gap: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="logo-mark" style={{ width: 38, height: 38, fontSize: 19, boxShadow: 'none' }} aria-hidden="true">
              K
            </span>
            <strong style={{ fontSize: 22, color: '#fff' }}>{SHOP.name}</strong>
          </span>
          <p style={{ margin: '0 0 6px' }}>Website thương mại điện tử và đặt hàng trực tuyến.</p>
          <span>Địa chỉ: {SHOP.address}</span>
          <span>Hotline: {SHOP.hotline}</span>
          <span>Email: {SHOP.email}</span>
        </div>
        <div>
          <h3>Mua sắm</h3>
          <ul>
            <li><Link to="/san-pham">Tất cả sản phẩm</Link></li>
            <li><Link to="/san-pham?sale=1">Đang giảm giá</Link></li>
            <li><Link to="/gio-hang">Giỏ hàng</Link></li>
          </ul>
        </div>
        <div>
          <h3>Hỗ trợ khách hàng</h3>
          <ul>
            <li><Link to="/tra-cuu-don-hang">Tra cứu đơn hàng</Link></li>
            <li><Link to="/tai-khoan/don-hang">Đơn hàng của tôi</Link></li>
            <li><Link to="/dang-nhap?tab=dang-ky">Đăng ký tài khoản</Link></li>
          </ul>
        </div>
        <div>
          <h3>Thanh toán</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="chip" style={{ background: 'transparent', color: '#e6e6e6', borderColor: '#e6e6e6' }}>Tiền mặt (COD)</span>
            <span className="chip" style={{ background: 'transparent', color: '#e6e6e6', borderColor: '#e6e6e6' }}>Chuyển khoản</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <span>© {new Date().getFullYear()} {SHOP.name}</span>
          <span>Đồ án thực tập tốt nghiệp · Nguyễn Công Khang (A44166) · Trường Đại học Thăng Long</span>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
