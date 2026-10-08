import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon, { categoryStyle } from '../components/Icon.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { ErrorBox, Loading, ProductImage } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { formatVnd } from '../format.js';

const TABS = [
  { sort: 'popular', label: 'Bán chạy' },
  { sort: 'newest', label: 'Mới về' },
  { sort: 'price_asc', label: 'Giá tốt' },
];

function ProductGrid({ result, count }) {
  if (result.loading) return <Loading />;
  if (result.error) return <ErrorBox error={result.error} onRetry={result.reload} />;
  return (
    <div className="product-grid">
      {result.data.items.slice(0, count).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState('popular');
  const categories = useApi('/categories');
  const deals = useApi('/products?sale=1&sort=discount&limit=4');
  const picks = useApi(`/products?sort=${tab}&limit=8`);
  const heroItems = deals.data?.items.slice(0, 2) ?? [];

  return (
    <div className="container page">
      <section className="hero">
        <div className="hero-copy">
          <span className="sticker" style={{ fontSize: 13, letterSpacing: '0.06em', transform: 'rotate(-3deg)' }}>
            MỚI • TUẦN NÀY
          </span>
          <h1>Săn deal mỗi ngày. Giao tận nơi.</h1>
          <p>Điện tử, thời trang, đồ gia dụng và nhiều món hay ho khác. Đặt vài bước, trả tiền khi nhận hàng.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            <Link to="/san-pham" className="btn btn-dark btn-lg">
              Mua ngay <Icon name="arrowRight" size={18} strokeWidth={2.4} />
            </Link>
            <Link to="/san-pham?sale=1" className="btn btn-lg btn-shadow">
              Xem hàng giảm giá
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden={heroItems.length === 0}>
          {heroItems.map((p, i) => (
            <Link
              key={p.id}
              to={`/san-pham/${p.slug}`}
              className={i === 0 ? 'hero-card hero-card-back' : 'hero-card'}
              style={i === 0 ? { left: '6%', top: 10, transform: 'rotate(-4deg)' } : { right: '2%', top: 104, transform: 'rotate(5deg)' }}
            >
              <ProductImage product={p} />
              <span className="hero-card-body">
                <span className="hero-card-name">{p.name}</span>
                <strong>{formatVnd(p.price)}</strong>
              </span>
            </Link>
          ))}
          <div className="hero-badge">
            <strong>COD</strong>
            trả khi nhận
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="h-danh-muc">
        <div className="section-head">
          <h2 id="h-danh-muc">Danh mục</h2>
          <Link to="/san-pham" style={{ fontWeight: 700 }}>
            Tất cả sản phẩm
          </Link>
        </div>
        {categories.error && <ErrorBox error={categories.error} onRetry={categories.reload} />}
        <div className="category-grid">
          {categories.data?.map((c, i) => {
            const style = categoryStyle(c.slug, i);
            return (
              <Link key={c.id} to={`/danh-muc/${c.slug}`} className="category-tile" style={{ background: style.color }}>
                <span className="category-icon">
                  <Icon name={style.icon} size={26} strokeWidth={1.9} />
                </span>
                {c.name}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section" aria-labelledby="h-giam-gia">
        <div className="section-head">
          <h2 id="h-giam-gia">Đang giảm giá</h2>
          <Link to="/san-pham?sale=1&sort=discount" style={{ fontWeight: 700 }}>
            Xem tất cả
          </Link>
        </div>
        <ProductGrid result={deals} count={4} />
      </section>

      <section className="section promo-grid" aria-label="Gợi ý danh mục">
        <Link to="/danh-muc/nha-cua-doi-song" className="promo" style={{ background: 'var(--mint)' }}>
          <strong>Đồ gia dụng mới về</strong>
          <span>Nồi, bình giữ nhiệt, hộp đựng thực phẩm, đèn bàn.</span>
          <span className="btn btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }}>
            Khám phá <Icon name="arrowRight" size={16} />
          </span>
        </Link>
        <Link to="/danh-muc/dien-tu" className="promo" style={{ background: 'var(--lilac)' }}>
          <strong>Phụ kiện công nghệ</strong>
          <span>Tai nghe, sạc dự phòng, bàn phím, chuột.</span>
          <span className="btn btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }}>
            Khám phá <Icon name="arrowRight" size={16} />
          </span>
        </Link>
      </section>

      <section className="section" aria-labelledby="h-goi-y">
        <div className="section-head">
          <h2 id="h-goi-y">Gợi ý cho bạn</h2>
          <div className="tabs" role="group" aria-label="Sắp xếp gợi ý">
            {TABS.map((t) => (
              <button key={t.sort} type="button" aria-pressed={tab === t.sort} onClick={() => setTab(t.sort)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <ProductGrid result={picks} count={8} />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
          <Link to={`/san-pham?sort=${tab}`} className="btn btn-accent btn-lg">
            Xem thêm sản phẩm
          </Link>
        </div>
      </section>
    </div>
  );
}
