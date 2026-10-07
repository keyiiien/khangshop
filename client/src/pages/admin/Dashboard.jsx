import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, Loading, ProductImage, StatusChip } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { PAYMENT, formatDateTime, formatVnd } from '../../format.js';

const todayText = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date());

function Kpi({ label, value, sub, icon, color, to }) {
  return (
    <div className="kpi" style={{ background: color }}>
      <div className="kpi-label">
        <span>{label}</span>
        <span><Icon name={icon} size={18} strokeWidth={2.2} /></span>
      </div>
      <span className="kpi-value">{value}</span>
      {to ? <Link to={to} style={{ fontSize: 13, fontWeight: 700 }}>{sub}</Link> : <span style={{ fontSize: 13 }}>{sub}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useApi('/admin/stats');

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const max = Math.max(...data.chart.map((c) => c.total), 1);
  const lastIndex = data.chart.length - 1;
  const chartLabel = data.chart.map((c) => `${c.day.slice(8)}/${c.day.slice(5, 7)}: ${formatVnd(c.total)}`).join('; ');

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Tổng quan</h1>
          <p className="muted" style={{ margin: '2px 0 0', textTransform: 'capitalize' }}>{todayText}</p>
        </div>
        <button type="button" className="btn btn-shadow" onClick={reload}>
          <Icon name="refresh" size={18} /> Làm mới
        </button>
      </div>

      <section className="kpi-grid" aria-label="Chỉ số hôm nay">
        <Kpi label="Giá trị đơn hôm nay" value={formatVnd(data.todayValue)} sub={`Từ ${data.todayCount} đơn hàng`} icon="trend" color="var(--accent)" />
        <Kpi label="Đơn chờ xác nhận" value={data.pending} sub="Xử lý ngay" icon="clock" color="var(--pink)" to="/quan-tri/don-hang?status=cho_xac_nhan" />
        <Kpi label="Đơn đang giao" value={data.shipping} sub="Đang trên đường tới khách" icon="truck" color="var(--lilac)" />
        <Kpi label="Sắp hết hàng" value={data.lowStockCount} sub="Sản phẩm tồn kho ≤ 5" icon="alert" color="var(--peach)" to="/quan-tri/san-pham?status=low" />
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <section className="card" style={{ flex: '2 1 520px', minWidth: 0 }}>
          <div className="summary-row" style={{ flexWrap: 'wrap', marginBottom: 18 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Giá trị đơn hàng 7 ngày qua</h2>
            <span className="muted" style={{ fontSize: 13 }}>Không tính đơn đã hủy</span>
          </div>
          <div className="chart" role="img" aria-label={`Biểu đồ cột giá trị đơn hàng theo ngày. ${chartLabel}`}>
            {data.chart.map((c, i) => (
              <div key={c.day} className="chart-col">
                <span>{c.total ? `${(c.total / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr` : '0'}</span>
                <span className={`chart-bar${i === lastIndex ? ' is-today' : ''}`} style={{ height: `${Math.round((c.total / max) * 190)}px` }} />
              </div>
            ))}
          </div>
          <div className="chart-labels" aria-hidden="true">
            {data.chart.map((c, i) => (
              <span key={c.day} style={{ fontWeight: i === lastIndex ? 700 : 400 }}>
                {i === lastIndex ? 'Hôm nay' : `${c.day.slice(8)}/${c.day.slice(5, 7)}`}
              </span>
            ))}
          </div>
        </section>

        <section className="card stack" style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div className="summary-row">
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Sắp hết hàng</h2>
            <Link to="/quan-tri/san-pham?status=low" style={{ fontSize: 13, fontWeight: 700 }}>Quản lý kho</Link>
          </div>
          {data.lowStock.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Không có sản phẩm nào sắp hết hàng.</p>
          ) : (
            <ul className="mini-list">
              {data.lowStock.map((p) => (
                <li key={p.id}>
                  <span className="thumb thumb-sm" style={{ width: 44, height: 44 }}><ProductImage product={p} iconSize={18} /></span>
                  <span className="mini-name">
                    {p.name}
                    <span className="cell-sub">{p.sku}</span>
                  </span>
                  <span className="chip" style={{ background: p.stock === 0 ? 'var(--pink)' : 'var(--lemon)' }}>
                    {p.stock === 0 ? 'Hết hàng' : `Còn ${p.stock}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="summary-row" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Đơn hàng gần đây</h2>
          <Link to="/quan-tri/don-hang" style={{ fontSize: 13, fontWeight: 700 }}>Xem tất cả</Link>
        </div>
        <div className="table-wrap" style={{ boxShadow: 'none' }}>
          <table className="data" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th scope="col">Mã đơn</th>
                <th scope="col">Khách hàng</th>
                <th scope="col">Thời gian</th>
                <th scope="col" className="num">Tổng tiền</th>
                <th scope="col">Thanh toán</th>
                <th scope="col">Trạng thái</th>
                <th scope="col"><span className="visually-hidden">Thao tác</span></th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.code}>
                  <td style={{ fontWeight: 700 }}>{o.code}</td>
                  <td>{o.customerName}</td>
                  <td className="muted">{formatDateTime(o.createdAt)}</td>
                  <td className="num" style={{ fontWeight: 700 }}>{formatVnd(o.total)}</td>
                  <td>{o.paymentMethod === 'cod' ? 'COD' : PAYMENT.bank.label}</td>
                  <td><StatusChip status={o.status} /></td>
                  <td className="num"><Link to={`/quan-tri/don-hang?ma=${o.code}`} style={{ fontWeight: 700 }}>Xem</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
