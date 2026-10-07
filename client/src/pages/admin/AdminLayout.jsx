import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { Loading } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api.js';

const MENU = [
  { to: '/quan-tri', label: 'Tổng quan', icon: 'grid', end: true },
  { to: '/quan-tri/don-hang', label: 'Đơn hàng', icon: 'receipt', badge: true },
  { to: '/quan-tri/san-pham', label: 'Sản phẩm', icon: 'box' },
  { to: '/quan-tri/danh-muc', label: 'Danh mục', icon: 'tag' },
  { to: '/quan-tri/khach-hang', label: 'Khách hàng', icon: 'users' },
];

export default function AdminLayout() {
  const { user, ready, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);

  // Số đơn chờ xác nhận hiển thị trên menu; các trang con gọi lại sau khi đổi trạng thái đơn
  const refreshPending = useCallback(() => {
    api('/admin/stats')
      .then((s) => setPending(s.pending))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') refreshPending();
  }, [user, refreshPending]);

  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/dang-nhap" state={{ from: location.pathname }} replace />;
  if (user.role !== 'admin') {
    return (
      <div className="container page">
        <div className="empty-state">
          <h1 style={{ fontSize: 28 }}>Bạn không có quyền truy cập trang quản trị</h1>
          <Link to="/" className="btn btn-dark">Về trang chủ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-side" aria-label="Menu quản trị">
        <Link to="/quan-tri" className="admin-brand">
          <span className="logo-mark" aria-hidden="true">K</span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <strong style={{ fontSize: 19, color: '#fff' }}>KhangShop</strong>
            <span style={{ fontSize: 12, color: '#bdbdbd' }}>Trang quản trị</span>
          </span>
        </Link>
        <nav className="admin-nav" aria-label="Chức năng quản trị">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} end={m.end}>
              <Icon name={m.icon} />
              <span className="grow">{m.label}</span>
              {m.badge && pending > 0 && <span className="badge" aria-label={`${pending} đơn chờ xác nhận`}>{pending}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="admin-foot">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px' }}>
            <Icon name="external" size={18} /> Xem cửa hàng
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px' }}>
            <span style={{ flex: '0 0 38px', height: 38, borderRadius: '50%', background: 'var(--mint)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }} aria-hidden="true">
              QT
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{user.fullName}</span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/dang-nhap');
                }}
                style={{ border: 0, background: 'none', padding: 0, color: '#bdbdbd', textAlign: 'left', fontSize: 13, textDecoration: 'underline' }}
              >
                Đăng xuất
              </button>
            </span>
          </div>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet context={{ refreshPending }} />
      </main>
    </div>
  );
}
