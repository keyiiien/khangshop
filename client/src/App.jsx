import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderTracking, { LookupPage } from './pages/OrderTracking.jsx';
import Login from './pages/Login.jsx';
import MyOrders from './pages/MyOrders.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Orders from './pages/admin/Orders.jsx';
import Products from './pages/admin/Products.jsx';
import Categories from './pages/admin/Categories.jsx';
import Customers from './pages/admin/Customers.jsx';

const TITLES = {
  '/': 'KhangShop – Mua sắm trực tuyến',
  '/san-pham': 'Sản phẩm – KhangShop',
  '/gio-hang': 'Giỏ hàng – KhangShop',
  '/thanh-toan': 'Thanh toán – KhangShop',
  '/dang-nhap': 'Đăng nhập – KhangShop',
  '/tra-cuu-don-hang': 'Tra cứu đơn hàng – KhangShop',
  '/tai-khoan/don-hang': 'Đơn hàng của tôi – KhangShop',
};

// Cuộn lên đầu và đặt tiêu đề tab khi chuyển trang
function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (TITLES[pathname]) document.title = TITLES[pathname];
    else if (pathname.startsWith('/quan-tri')) document.title = 'Quản trị – KhangShop';
    else if (pathname.startsWith('/don-hang')) document.title = 'Đơn hàng – KhangShop';
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="container page">
      <div className="empty-state">
        <h1 style={{ fontSize: 32 }}>Không tìm thấy trang</h1>
        <p className="muted" style={{ margin: 0 }}>Đường dẫn không tồn tại hoặc đã bị thay đổi.</p>
        <Link to="/" className="btn btn-dark">Về trang chủ</Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <RouteEffects />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="san-pham" element={<Catalog />} />
          <Route path="danh-muc/:slug" element={<Catalog />} />
          <Route path="san-pham/:slug" element={<ProductDetail />} />
          <Route path="gio-hang" element={<Cart />} />
          <Route path="thanh-toan" element={<Checkout />} />
          <Route path="don-hang/:code" element={<OrderTracking />} />
          <Route path="tra-cuu-don-hang" element={<LookupPage />} />
          <Route path="dang-nhap" element={<Login />} />
          <Route path="tai-khoan/don-hang" element={<MyOrders />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="quan-tri" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="don-hang" element={<Orders />} />
          <Route path="san-pham" element={<Products />} />
          <Route path="danh-muc" element={<Categories />} />
          <Route path="khach-hang" element={<Customers />} />
        </Route>
      </Routes>
    </>
  );
}
