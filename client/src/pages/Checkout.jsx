import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { CheckoutSteps, ProductImage } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../api.js';
import { PAYMENT, PROVINCES, SHIPPING, formatVnd } from '../format.js';
import { rememberOrder } from './OrderTracking.jsx';

function validate(form) {
  const errors = {};
  if (!form.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên';
  if (!/^0\d{9}$/.test(form.phone.replace(/[\s.-]/g, ''))) errors.phone = 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0';
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email không hợp lệ';
  if (!form.province) errors.province = 'Vui lòng chọn tỉnh/thành phố';
  if (!form.ward.trim()) errors.ward = 'Vui lòng nhập phường/xã';
  if (!form.address.trim()) errors.address = 'Vui lòng nhập địa chỉ cụ thể';
  if (!form.agree) errors.agree = 'Bạn cần đồng ý với điều khoản mua hàng';
  return errors;
}

function Field({ id, label, error, required, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    province: '',
    ward: '',
    address: '',
    note: '',
    shippingMethod: 'standard',
    paymentMethod: 'cod',
    agree: false,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Thông tin tài khoản có thể tải xong sau khi trang đã hiển thị
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      fullName: f.fullName || user.fullName,
      phone: f.phone || user.phone,
      email: f.email || user.email,
    }));
  }, [user]);

  if (items.length === 0 && !submitting) return <Navigate to="/gio-hang" replace />;

  const fee = SHIPPING[form.shippingMethod].fee;
  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };
  const inputProps = (key) => ({
    id: `tt-${key}`,
    value: form[key],
    onChange: set(key),
    'aria-invalid': errors[key] ? 'true' : undefined,
    'aria-describedby': errors[key] ? `tt-${key}-error` : undefined,
  });

  async function submit(e) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    setSubmitError('');
    const firstError = Object.keys(found)[0];
    if (firstError) {
      document.getElementById(`tt-${firstError}`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const { agree, shippingMethod, paymentMethod, ...customer } = form;
      const result = await api('/orders', {
        method: 'POST',
        body: {
          customer,
          shippingMethod,
          paymentMethod,
          items: items.map((it) => ({ productId: it.productId, quantity: it.quantity })),
        },
      });
      const phone = customer.phone.replace(/[\s.-]/g, '');
      rememberOrder(result.code, phone);
      clear();
      navigate(`/don-hang/${result.code}`, { state: { phone, justPlaced: true } });
    } catch (err) {
      setSubmitError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="container page">
      <CheckoutSteps current={1} />
      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 24 }}>Thanh toán</h1>

      <form className="two-col" onSubmit={submit} noValidate>
        <div className="main stack" style={{ gap: 24 }}>
          <section className="card">
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px 16px', marginBottom: 20 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>1. Thông tin nhận hàng</h2>
              {!user && (
                <span style={{ fontSize: 14 }}>
                  Đã có tài khoản? <Link to="/dang-nhap" state={{ from: '/thanh-toan' }} style={{ fontWeight: 700 }}>Đăng nhập</Link> để điền nhanh
                </span>
              )}
            </div>
            <div className="form-grid">
              <Field id="tt-fullName" label="Họ và tên" required error={errors.fullName}>
                <input className="input" type="text" autoComplete="name" {...inputProps('fullName')} />
              </Field>
              <Field id="tt-phone" label="Số điện thoại" required error={errors.phone}>
                <input className="input" type="tel" autoComplete="tel" inputMode="tel" {...inputProps('phone')} />
              </Field>
              <div className="span-all">
                <Field id="tt-email" label="Email (không bắt buộc)" error={errors.email}>
                  <input className="input" type="email" autoComplete="email" {...inputProps('email')} />
                </Field>
              </div>
              <Field id="tt-province" label="Tỉnh / Thành phố" required error={errors.province}>
                <select className="select" {...inputProps('province')}>
                  <option value="">Chọn Tỉnh / Thành phố</option>
                  {PROVINCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field id="tt-ward" label="Phường / Xã" required error={errors.ward} hint="Địa chỉ theo 2 cấp: Tỉnh/Thành phố – Phường/Xã">
                <input className="input" type="text" {...inputProps('ward')} />
              </Field>
              <div className="span-all">
                <Field id="tt-address" label="Địa chỉ cụ thể" required error={errors.address}>
                  <input className="input" type="text" autoComplete="street-address" placeholder="Số nhà, tên đường, tòa nhà…" {...inputProps('address')} />
                </Field>
              </div>
              <div className="span-all">
                <Field id="tt-note" label="Ghi chú đơn hàng">
                  <textarea className="textarea" rows={3} placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao…" {...inputProps('note')} />
                </Field>
              </div>
            </div>
          </section>

          <fieldset className="card" style={{ margin: 0 }}>
            <legend style={{ float: 'left', width: '100%', padding: 0, marginBottom: 18, fontSize: 22, fontWeight: 800 }}>2. Phương thức giao hàng</legend>
            <div className="form-grid" style={{ clear: 'both' }}>
              {Object.entries(SHIPPING).map(([value, s]) => (
                <label key={value} className="option">
                  <input type="radio" name="shippingMethod" value={value} checked={form.shippingMethod === value} onChange={set('shippingMethod')} />
                  <span className="option-body">
                    <span className="option-title">{s.label}</span>
                    <span className="option-sub">{s.sub}</span>
                  </span>
                  <strong>{formatVnd(s.fee)}</strong>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="card" style={{ margin: 0 }}>
            <legend style={{ float: 'left', width: '100%', padding: 0, marginBottom: 18, fontSize: 22, fontWeight: 800 }}>3. Phương thức thanh toán</legend>
            <div className="stack" style={{ clear: 'both', gap: 14 }}>
              {Object.entries(PAYMENT).map(([value, p]) => (
                <label key={value} className="option">
                  <input type="radio" name="paymentMethod" value={value} checked={form.paymentMethod === value} onChange={set('paymentMethod')} />
                  <span className="option-body">
                    <span className="option-title">{p.label}</span>
                    <span className="option-sub">{p.sub}</span>
                  </span>
                </label>
              ))}
              {form.paymentMethod === 'bank' && (
                <p className="alert alert-info" style={{ margin: 0, display: 'flex', gap: 10 }}>
                  <Icon name="info" size={22} />
                  <span>Sau khi đặt hàng, bạn sẽ thấy số tài khoản và nội dung chuyển khoản (chính là mã đơn hàng).</span>
                </p>
              )}
            </div>
          </fieldset>
        </div>

        <aside className="side card stack" aria-label="Đơn hàng của bạn">
          <div className="summary-row">
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>Đơn hàng của bạn</h2>
            <Link to="/gio-hang" style={{ fontSize: 14, fontWeight: 600 }}>Sửa</Link>
          </div>
          <ul className="mini-list">
            {items.map((it) => (
              <li key={it.productId}>
                <span className="thumb thumb-sm" style={{ position: 'relative', overflow: 'visible' }}>
                  <span style={{ display: 'block', height: '100%', borderRadius: 10, overflow: 'hidden' }}>
                    <ProductImage product={it} iconSize={20} />
                  </span>
                  <span className="badge" style={{ position: 'absolute', top: -9, right: -9, background: 'var(--accent)' }}>{it.quantity}</span>
                </span>
                <span className="mini-name">{it.name}</span>
                <strong style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{formatVnd(it.price * it.quantity)}</strong>
              </li>
            ))}
          </ul>
          <hr className="divider" />
          <div className="summary-row"><span>Tạm tính</span><strong>{formatVnd(subtotal)}</strong></div>
          <div className="summary-row"><span>Phí vận chuyển</span><strong>{formatVnd(fee)}</strong></div>
          <hr className="divider" />
          <div className="summary-row"><span style={{ fontSize: 17, fontWeight: 700 }}>Tổng cộng</span><span className="summary-total">{formatVnd(subtotal + fee)}</span></div>
          <label className="check">
            <input type="checkbox" id="tt-agree" checked={form.agree} onChange={set('agree')} aria-invalid={errors.agree ? 'true' : undefined} aria-describedby={errors.agree ? 'tt-agree-error' : undefined} />
            <span>Tôi đã kiểm tra thông tin và đồng ý với điều khoản mua hàng của KhangShop.</span>
          </label>
          {errors.agree && <span className="field-error" id="tt-agree-error">{errors.agree}</span>}
          {submitError && <p className="alert alert-error" role="alert" style={{ margin: 0 }}>{submitError}</p>}
          <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={submitting}>
            {submitting ? 'Đang đặt hàng…' : 'Đặt hàng'}
            {!submitting && <Icon name="arrowRight" strokeWidth={2.4} />}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: 13, textAlign: 'center' }}>
            Giá cuối cùng được hệ thống kiểm tra lại khi đặt hàng.
          </p>
        </aside>
      </form>
    </div>
  );
}
