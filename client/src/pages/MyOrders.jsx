import { Link, Navigate } from 'react-router-dom';
import { ErrorBox, Loading, StatusChip } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { PAYMENT, formatDateTime, formatVnd } from '../format.js';

export default function MyOrders() {
  const { user, ready } = useAuth();
  const orders = useApi(user ? '/orders/mine' : null);

  if (!ready) return <div className="container page"><Loading /></div>;
  if (!user) return <Navigate to="/dang-nhap" state={{ from: '/tai-khoan/don-hang' }} replace />;

  return (
    <div className="container page stack" style={{ gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 36, fontWeight: 800 }}>Đơn hàng của tôi</h1>
        <p className="muted" style={{ margin: '6px 0 0' }}>{user.fullName} · {user.email}</p>
      </div>
      {orders.loading && <Loading />}
      <ErrorBox error={orders.error} onRetry={orders.reload} />
      {orders.data?.length === 0 && (
        <div className="empty-state">
          <h2 style={{ fontSize: 24 }}>Bạn chưa có đơn hàng nào</h2>
          <Link to="/san-pham" className="btn btn-dark">Bắt đầu mua sắm</Link>
        </div>
      )}
      {orders.data?.length > 0 && (
        <div className="table-wrap">
          <table className="data" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th scope="col">Mã đơn</th>
                <th scope="col">Ngày đặt</th>
                <th scope="col">Sản phẩm</th>
                <th scope="col" className="num">Tổng tiền</th>
                <th scope="col">Trạng thái</th>
                <th scope="col"><span className="visually-hidden">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr key={o.code}>
                  <td style={{ fontWeight: 700 }}>{o.code}</td>
                  <td>{formatDateTime(o.createdAt)}</td>
                  <td>{o.itemCount} sản phẩm</td>
                  <td className="num">
                    <strong>{formatVnd(o.total)}</strong>
                    <span className="cell-sub">{PAYMENT[o.paymentMethod]?.label}</span>
                  </td>
                  <td><StatusChip status={o.status} /></td>
                  <td className="num">
                    <Link to={`/don-hang/${o.code}`} className="btn btn-sm">Xem chi tiết</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
