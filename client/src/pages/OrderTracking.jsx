import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBox, Loading, ProductImage, StatusChip } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { PAYMENT, SHIPPING, SHOP, STATUS, STATUS_FLOW, formatDateTime, formatVnd } from '../format.js';

function Timeline({ order }) {
  const at = Object.fromEntries(order.history.map((h) => [h.status, h.at]));
  if (order.status === 'da_huy') {
    return (
      <ol className="timeline">
        <li className="is-done"><strong>Đã đặt hàng</strong><span>{formatDateTime(order.createdAt)}</span></li>
        <li className="is-cancelled"><strong>Đã hủy</strong><span>{formatDateTime(at.da_huy)}</span></li>
      </ol>
    );
  }
  const current = STATUS_FLOW.indexOf(order.status);
  const notes = ['Cửa hàng sẽ liên hệ xác nhận', 'Cửa hàng xác nhận và đóng gói', 'Đơn đã giao cho đơn vị vận chuyển', 'Bạn nhận hàng và thanh toán'];
  return (
    <ol className="timeline">
      {STATUS_FLOW.map((s, i) => (
        <li key={s} className={i < current ? 'is-done' : i === current ? 'is-current' : ''} aria-current={i === current ? 'step' : undefined}>
          <strong>{i + 1}. {STATUS[s].label}</strong>
          <span style={{ fontSize: 13 }}>{at[s] ? formatDateTime(at[s]) : notes[i]}</span>
        </li>
      ))}
    </ol>
  );
}

export default function OrderTracking() {
  const { code } = useParams();
  const location = useLocation();
  const { user, ready } = useAuth();
  const justPlaced = Boolean(location.state?.justPlaced);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrder(await api(`/orders/mine/${code}`));
    } catch (err) {
      setError(err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Đơn hàng gắn với tài khoản: phải đăng nhập mới xem được
  useEffect(() => {
    if (ready && user) load();
  }, [ready, user, load]);

  async function cancel() {
    if (!window.confirm(`Bạn chắc chắn muốn hủy đơn ${order.code}?`)) return;
    setCancelling(true);
    try {
      setOrder(await api(`/orders/mine/${order.code}/cancel`, { method: 'POST' }));
    } catch (err) {
      setError(err);
    } finally {
      setCancelling(false);
    }
  }

  if (ready && !user) return <Navigate to="/dang-nhap" state={{ from: location.pathname }} replace />;
  if (!ready || loading) return <div className="container page"><Loading /></div>;
  if (!order) {
    return (
      <div className="container page stack" style={{ gap: 20 }}>
        {error && error.status !== 404 && <ErrorBox error={error} onRetry={load} />}
        <div className="empty-state">
          <h1 style={{ fontSize: 28 }}>Không tìm thấy đơn hàng {code}</h1>
          <p className="muted" style={{ margin: 0 }}>Đơn hàng không tồn tại hoặc không thuộc tài khoản đang đăng nhập.</p>
          <Link to="/tai-khoan/don-hang" className="btn btn-dark">Xem đơn hàng của tôi</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page stack" style={{ gap: 32 }}>
      {justPlaced && (
        <section className="success-banner">
          <span className="success-icon"><Icon name="check" size={48} strokeWidth={2.6} /></span>
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <h1>Đặt hàng thành công!</h1>
            <p style={{ margin: '0 0 18px', fontSize: 17 }}>Cảm ơn bạn đã mua sắm tại DailyCart. Cửa hàng sẽ liên hệ để xác nhận đơn hàng.</p>
            <span className="chip" style={{ height: 46, padding: '0 16px', fontSize: 15, borderRadius: 12 }}>
              Mã đơn hàng: <strong style={{ marginLeft: 6, fontSize: 17 }}>{order.code}</strong>
            </span>
          </div>
          <Link to="/san-pham" className="btn btn-lg btn-shadow">Tiếp tục mua sắm</Link>
        </section>
      )}

      {order.paymentMethod === 'bank' && order.status === 'cho_xac_nhan' && (
        <section className="card" aria-labelledby="h-chuyen-khoan">
          <h2 id="h-chuyen-khoan" style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>Thông tin chuyển khoản</h2>
          <div className="bank-box">
            <span>Ngân hàng: <strong>{SHOP.bank.name}</strong></span>
            <span>Số tài khoản: <strong>{SHOP.bank.account}</strong></span>
            <span>Chủ tài khoản: <strong>{SHOP.bank.holder}</strong></span>
            <span>Số tiền: <strong>{formatVnd(order.total)}</strong></span>
            <span>Nội dung chuyển khoản: <strong>{order.code}</strong></span>
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="h-trang-thai">
        <div className="summary-row" style={{ flexWrap: 'wrap', marginBottom: 22 }}>
          <h2 id="h-trang-thai" style={{ fontSize: 24, fontWeight: 800 }}>Đơn hàng {order.code}</h2>
          <StatusChip status={order.status} large />
        </div>
        <Timeline order={order} />
        {order.status === 'cho_xac_nhan' && (
          <div style={{ marginTop: 22, paddingTop: 20, borderTop: 'var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px 20px' }}>
            <p style={{ margin: 0, fontSize: 14 }}>Bạn có thể hủy đơn khi đơn còn ở trạng thái <strong>Chờ xác nhận</strong>.</p>
            <button type="button" className="btn btn-pink" onClick={cancel} disabled={cancelling}>
              {cancelling ? 'Đang hủy…' : 'Hủy đơn hàng'}
            </button>
          </div>
        )}
        {error && <div style={{ marginTop: 16 }}><ErrorBox error={error} /></div>}
      </section>

      <div className="two-col">
        <section className="card" style={{ flex: '1 1 380px', minWidth: 0 }} aria-labelledby="h-nhan-hang">
          <h2 id="h-nhan-hang" style={{ fontSize: 22, fontWeight: 800, marginBottom: 18 }}>Thông tin nhận hàng</h2>
          <dl className="info-list">
            <dt>Người nhận</dt><dd>{order.customerName}</dd>
            <dt>Điện thoại</dt><dd>{order.phone}</dd>
            <dt>Địa chỉ</dt><dd>{order.addressDetail}, {order.ward}, {order.province}</dd>
            <dt>Giao hàng</dt><dd>{SHIPPING[order.shippingMethod]?.label}</dd>
            <dt>Thanh toán</dt><dd>{PAYMENT[order.paymentMethod]?.label}</dd>
            <dt>Ngày đặt</dt><dd>{formatDateTime(order.createdAt)}</dd>
            {order.note && (<><dt>Ghi chú</dt><dd>{order.note}</dd></>)}
          </dl>
        </section>

        <section className="card stack" style={{ flex: '1 1 420px', minWidth: 0, gap: 14 }} aria-labelledby="h-san-pham">
          <h2 id="h-san-pham" style={{ fontSize: 22, fontWeight: 800 }}>Sản phẩm đã đặt</h2>
          <ul className="mini-list">
            {order.items.map((it, i) => (
              <li key={`${it.productId}-${i}`}>
                <span className="thumb thumb-sm"><ProductImage product={{ ...it, id: it.productId ?? i }} iconSize={20} /></span>
                <span className="mini-name">
                  {it.slug ? <Link to={`/san-pham/${it.slug}`} style={{ textDecoration: 'none' }}>{it.name}</Link> : it.name}
                  <span className="cell-sub">{formatVnd(it.unitPrice)} × {it.quantity}</span>
                </span>
                <strong style={{ whiteSpace: 'nowrap' }}>{formatVnd(it.lineTotal)}</strong>
              </li>
            ))}
          </ul>
          <hr className="divider" />
          <div className="summary-row"><span>Tạm tính</span><strong>{formatVnd(order.subtotal)}</strong></div>
          <div className="summary-row"><span>Phí vận chuyển</span><strong>{formatVnd(order.shippingFee)}</strong></div>
          {order.discount > 0 && (
            <div className="summary-row"><span>Giảm giá ({order.couponCode})</span><strong>−{formatVnd(order.discount)}</strong></div>
          )}
          <div className="summary-row" style={{ padding: '14px 16px', border: 'var(--border)', borderRadius: 14, background: 'var(--accent)', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{order.paymentMethod === 'cod' ? 'Cần thanh toán khi nhận hàng' : 'Tổng cộng'}</span>
            <span className="summary-total" style={{ fontSize: 26 }}>{formatVnd(order.total)}</span>
          </div>
        </section>
      </div>

      <Link to="/tai-khoan/don-hang" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
        <Icon name="arrowLeft" size={18} /> Về danh sách đơn hàng của tôi
      </Link>
    </div>
  );
}
