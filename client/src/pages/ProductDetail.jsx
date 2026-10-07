import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorBox, Loading, ProductImage, QtyStepper } from '../components/ui.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { discountPercent, formatVnd } from '../format.js';

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add, items } = useCart();
  const { data, error, loading, reload } = useApi(`/products/${slug}`);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setQty(1);
    setAdded(false);
  }, [slug]);

  useEffect(() => {
    if (data) document.title = `${data.product.name} – KhangShop`;
  }, [data]);

  if (loading) return <div className="container page"><Loading /></div>;
  if (error) {
    return (
      <div className="container page stack">
        <ErrorBox error={error} onRetry={error.status === 404 ? undefined : reload} />
        <Link to="/san-pham" className="btn btn-dark" style={{ alignSelf: 'flex-start' }}>Xem sản phẩm khác</Link>
      </div>
    );
  }

  const { product, related } = data;
  const inCart = items.find((it) => it.productId === product.id)?.quantity ?? 0;
  const maxQty = Math.max(0, Math.min(99, product.stock) - inCart);
  const soldOut = product.stock === 0;

  function addToCart() {
    add(product, qty);
    setAdded(true);
  }

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/danh-muc/${product.category.slug}`}>{product.category.name}</Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{product.name}</span>
      </nav>

      <section className="detail">
        <div className="detail-media" style={{ position: 'relative' }}>
          <ProductImage product={product} iconSize={64} />
          {product.oldPrice && (
            <span className="sticker" style={{ position: 'absolute', top: 18, left: 18, fontSize: 18 }}>
              -{discountPercent(product.price, product.oldPrice)}%
            </span>
          )}
        </div>

        <div className="detail-info">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link to={`/danh-muc/${product.category.slug}`} className="chip" style={{ height: 32, fontSize: 13, textDecoration: 'none' }}>
              {product.category.name}
            </Link>
            <span className="chip" style={{ height: 32, fontSize: 13, background: soldOut ? 'var(--pink)' : 'var(--mint)' }}>
              {soldOut ? 'Hết hàng' : 'Còn hàng'}
            </span>
          </div>
          <div>
            <h1>{product.name}</h1>
            <span className="muted" style={{ fontSize: 14 }}>Mã sản phẩm: {product.sku}</span>
          </div>

          <div className="price-box">
            <span className="price">{formatVnd(product.price)}</span>
            {product.oldPrice && (
              <>
                <span className="price-old" style={{ fontSize: 18, color: '#333' }}>{formatVnd(product.oldPrice)}</span>
                <span className="chip" style={{ height: 30, fontSize: 13 }}>Tiết kiệm {formatVnd(product.oldPrice - product.price)}</span>
              </>
            )}
          </div>

          {!soldOut && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 18px' }}>
              <span style={{ fontWeight: 700 }}>Số lượng</span>
              <QtyStepper value={Math.min(qty, Math.max(maxQty, 1))} max={Math.max(maxQty, 1)} onChange={setQty} label={product.name} />
              <span className="muted" style={{ fontSize: 14 }}>
                Còn {product.stock} sản phẩm{inCart > 0 && ` · đã có ${inCart} trong giỏ`}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <button type="button" className="btn btn-lg btn-shadow" style={{ flex: '1 1 200px' }} disabled={soldOut || maxQty === 0} onClick={addToCart}>
              <Icon name="cart" /> Thêm vào giỏ
            </button>
            <button
              type="button"
              className="btn btn-lg btn-dark"
              style={{ flex: '1 1 200px' }}
              disabled={soldOut}
              onClick={() => {
                if (maxQty > 0) add(product, qty);
                navigate('/gio-hang');
              }}
            >
              Mua ngay <Icon name="arrowRight" size={18} strokeWidth={2.4} />
            </button>
          </div>
          {maxQty === 0 && !soldOut && (
            <p className="alert alert-info" style={{ margin: 0 }}>Bạn đã thêm toàn bộ số lượng còn lại vào giỏ.</p>
          )}

          {added && (
            <div className="alert alert-success" role="status" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="check" strokeWidth={2.6} /> Đã thêm vào giỏ hàng
              </span>
              <Link to="/gio-hang" style={{ fontWeight: 700 }}>Xem giỏ hàng</Link>
            </div>
          )}

          <div className="service-box">
            <span><Icon name="truck" size={22} /> <span><strong>Giao hàng toàn quốc</strong>, theo dõi trạng thái đơn trên website</span></span>
            <span><Icon name="wallet" size={22} /> <span><strong>Thanh toán khi nhận hàng</strong> hoặc chuyển khoản</span></span>
            <span><Icon name="refresh" size={22} /> <span><strong>Đổi trả trong 7 ngày</strong> nếu sản phẩm lỗi</span></span>
          </div>
        </div>
      </section>

      <section className="section card" aria-labelledby="h-mo-ta">
        <h2 id="h-mo-ta" style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>Mô tả sản phẩm</h2>
        <p className="prose" style={{ margin: 0 }}>{product.description || 'Sản phẩm chưa có mô tả.'}</p>
      </section>

      {related.length > 0 && (
        <section className="section" aria-labelledby="h-lien-quan">
          <div className="section-head">
            <h2 id="h-lien-quan">Sản phẩm tương tự</h2>
            <Link to={`/danh-muc/${product.category.slug}`} style={{ fontWeight: 700 }}>Xem tất cả</Link>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
