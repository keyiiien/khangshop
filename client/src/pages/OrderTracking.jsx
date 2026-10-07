import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { ErrorBox, Loading, ProductImage, StatusChip } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import { PAYMENT, SHIPPING, SHOP, STATUS, STATUS_FLOW, formatDateTime, formatVnd } from '../format.js';

const LOOKUP_KEY = 'khangshop.orders';

// Ghi nhớ số điện thoại của đơn vừa đặt trong phiên, để khách xem lại mà không phải nhập lại
export function rememberOrder(code, phone) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(LOOKUP_KEY)) ?? {};
    sessionStorage.setItem(LOOKUP_KEY, JSON.stringify({ ...saved, [code]: phone }));
  } catch {
    // bỏ qua
  }
}

function rememberedPhone(code) {
  try {
    return (JSON.parse(sessionStorage.getItem(LOOKUP_KEY)) ?? {})[code] ?? '';
  } catch {
    return '';
  }
}

export function LookupForm({ initialCode = '' }) {
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const order = await api('/orders/lookup', { method: 'POST', body: { code, phone } });
      rememberOrder(order.code, order.phone);
      navigate(`/don-hang/${order.code}`, { state: { phone: order.phone } });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ background: 'var(--surface)', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px 20px' }}>
      <div style={{ flex: '1 1 260px' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Tra cứu đơn hàng</h2>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Không cần đăng nhập, chỉ cần mã đơn và số điện thoại đặt hàng.</p>
      </div>
      <div className="field" style={{ flex: '1 1 200px' }}>
        <label htmlFor="tc-ma">Mã đơn hàng</label>
        <input id="tc-ma" className="input input-upper" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ví dụ: DH261007-0001" />
      </div>
      <div className="field" style={{ flex: '1 1 200px' }}>
        <label htmlFor="tc-sdt">Số điện thoại</label>
        <input id="tc-sdt" className="input" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
      </div>
      <button type="submit" className="btn btn-dark" style={{ height: 50 }} disabled={busy}>
        {busy ? 'Đang tìm…' : 'Tra cứu'}
      </button>
      {error && <div style={{ flexBasis: '100%' }}><ErrorBox error={error} /></div>}
    </form>
  );
}

export function LookupPage() {
  return (
    <div className="container page">
      <LookupForm />
    </div>
  );
}

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
  const phone = location.state?.phone || rememberedPhone(code);
  const justPlaced = Boolean(location.state?.justPlaced);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (phone) setOrder(await api('/orders/lookup', { method: 'POST', body: { code, phone } }));
      else if (user) setOrder(await api(`/orders/mine/${code}`));
      else setOrder(null);
    } catch (err) {
      setError(err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [code, phone, user]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function cancel() {
    if (!window.confirm(`Bạn chắc chắn muốn hủy đơn ${order.code}?`)) return;
    setCancelling(true);
    try {
      setOrder(await api('/orders/cancel', { method: 'POST', body: { code: order.code, phone: order.phone } }));
    } catch (err) {
      setError(err);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <div className="container page"><Loading /></div>;
  if (!order) {
    return (
      <div className="container page stack" style={{ gap: 20 }}>
        {error && error.status !== 404 && <ErrorBox error={error} onRetry={load} />}
        <p className="alert alert-info" style={{ margin: 0 }}>Nhập số điện thoại đặt hàng để xem đơn <strong>{code}</strong>.</p>
        <LookupForm initialCode={code} />
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
            <p style={{ margin: '0 0 18px', fontSize: 17 }}>Cảm ơn bạn đã mua sắm tại KhangShop. Cửa hàng sẽ liên hệ để xác nhận đơn hàng.</p>
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
          <div className="summary-row" style={{ padding: '14px 16px', border: 'var(--border)', borderRadius: 14, background: 'var(--accent)', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>{order.paymentMethod === 'cod' ? 'Cần thanh toán khi nhận hàng' : 'Tổng cộng'}</span>
            <span className="summary-total" style={{ fontSize: 26 }}>{formatVnd(order.total)}</span>
          </div>
        </section>
      </div>

      <LookupForm />
    </div>
  );
}
