import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { CheckoutSteps, ProductImage, QtyStepper } from '../components/ui.jsx';
import { useCart } from '../context/CartContext.jsx';
import { api } from '../api.js';
import { formatVnd } from '../format.js';

export default function Cart() {
  const { items, count, subtotal, update, remove, sync } = useCart();
  const [notice, setNotice] = useState('');

  // Đối chiếu giỏ hàng với giá và tồn kho hiện tại trên server
  useEffect(() => {
    if (items.length === 0) return;
    api(`/products/batch?ids=${items.map((it) => it.productId).join(',')}`)
      .then((fresh) => {
        if (sync(fresh)) setNotice('Một số sản phẩm đã thay đổi giá, số lượng còn lại hoặc ngừng bán. Giỏ hàng đã được cập nhật.');
      })
      .catch(() => {});
    // Chỉ kiểm tra một lần khi mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container page">
      <CheckoutSteps current={0} />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px 14px', marginBottom: 24 }}>
        <h1 style={{ fontSize: 40, fontWeight: 800 }}>Giỏ hàng</h1>
        <span className="chip" style={{ height: 32, fontSize: 14 }}>{count} sản phẩm</span>
      </div>
      {notice && <p className="alert alert-info" role="status" style={{ marginTop: 0 }}>{notice}</p>}

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="icon-circle"><Icon name="cart" size={38} /></span>
          <h2 style={{ fontSize: 26 }}>Giỏ hàng của bạn đang trống</h2>
          <p className="muted" style={{ margin: 0 }}>Hãy khám phá các danh mục và thêm sản phẩm bạn thích vào giỏ.</p>
          <Link to="/san-pham" className="btn btn-dark btn-lg">Tiếp tục mua sắm</Link>
        </div>
      ) : (
        <div className="two-col">
          <section className="main stack" style={{ gap: 18 }} aria-label="Sản phẩm trong giỏ">
            {items.map((it) => (
              <article key={it.productId} className="cart-line">
                <Link to={`/san-pham/${it.slug}`} className="thumb" tabIndex={-1} aria-hidden="true">
                  <ProductImage product={it} iconSize={28} />
                </Link>
                <div style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {it.category && <span className="product-cat">{it.category}</span>}
                  <Link to={`/san-pham/${it.slug}`} style={{ fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>{it.name}</Link>
                  <span className="muted" style={{ fontSize: 14 }}>Đơn giá: {formatVnd(it.price)}</span>
                </div>
                <QtyStepper value={it.quantity} max={Math.min(99, it.stock ?? 99)} onChange={(q) => update(it.productId, q)} label={it.name} />
                <span className="line-total">{formatVnd(it.price * it.quantity)}</span>
                <button type="button" className="btn btn-icon" aria-label={`Xóa ${it.name} khỏi giỏ`} onClick={() => remove(it.productId)}>
                  <Icon name="trash" />
                </button>
              </article>
            ))}
            <Link to="/san-pham" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, marginTop: 6 }}>
              <Icon name="arrowLeft" size={18} /> Tiếp tục mua sắm
            </Link>
          </section>

          <aside className="side card stack" aria-label="Tóm tắt đơn hàng">
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>Tóm tắt đơn hàng</h2>
            <div className="summary-row"><span>Tạm tính ({count} sản phẩm)</span><strong>{formatVnd(subtotal)}</strong></div>
            <div className="summary-row"><span>Phí vận chuyển</span><span className="muted">Tính ở bước thanh toán</span></div>
            <hr className="divider" />
            <div className="summary-row"><span style={{ fontWeight: 700, fontSize: 17 }}>Tạm tính</span><span className="summary-total">{formatVnd(subtotal)}</span></div>
            <Link to="/thanh-toan" className="btn btn-accent btn-lg btn-block">
              Tiến hành thanh toán <Icon name="arrowRight" strokeWidth={2.4} />
            </Link>
            <p className="muted" style={{ margin: 0, fontSize: 13, textAlign: 'center' }}>
              Bạn có thể chọn thanh toán khi nhận hàng (COD) ở bước tiếp theo.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
