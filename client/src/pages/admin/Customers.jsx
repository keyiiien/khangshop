import { ErrorBox, Loading } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatDate, formatVnd } from '../../format.js';

export default function Customers() {
  const { data, error, loading, reload } = useApi('/admin/customers');

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Khách hàng</h1>
          <p className="muted" style={{ margin: '2px 0 0' }}>Tài khoản khách hàng đã đăng ký. Đơn của khách không đăng nhập xem ở trang Đơn hàng.</p>
        </div>
      </div>
      {loading && <Loading />}
      <ErrorBox error={error} onRetry={reload} />
      {data && (
        <div className="table-wrap">
          <table className="data" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th scope="col">Họ và tên</th>
                <th scope="col">Email</th>
                <th scope="col">Điện thoại</th>
                <th scope="col">Ngày đăng ký</th>
                <th scope="col" className="num">Số đơn</th>
                <th scope="col" className="num">Đã mua (đơn đã giao)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                  <td>{u.email}</td>
                  <td>{u.phone}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td className="num">{u.orderCount}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{formatVnd(u.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.length === 0 && <p className="muted" style={{ margin: 0, padding: '28px 16px', textAlign: 'center' }}>Chưa có khách hàng đăng ký.</p>}
        </div>
      )}
    </>
  );
}
