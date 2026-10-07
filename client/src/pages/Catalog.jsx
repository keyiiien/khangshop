import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { categoryStyle } from '../components/Icon.jsx';
import { ErrorBox, Loading, Pagination } from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { queryString } from '../api.js';

const PRICE_RANGES = [
  { label: 'Dưới 200.000₫', min: '', max: '200000' },
  { label: '200 – 500 nghìn', min: '200000', max: '500000' },
  { label: '500 nghìn – 1 triệu', min: '500000', max: '1000000' },
  { label: 'Trên 1 triệu', min: '1000000', max: '' },
];

const SORTS = [
  ['popular', 'Phổ biến nhất'],
  ['newest', 'Mới nhất'],
  ['price_asc', 'Giá tăng dần'],
  ['price_desc', 'Giá giảm dần'],
  ['discount', 'Giảm giá nhiều'],
];

// Trang danh sách: dùng cho /san-pham (tất cả, tìm kiếm) và /danh-muc/:slug
export default function Catalog() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const categories = useApi('/categories');
  const category = categories.data?.find((c) => c.slug === slug);
  const categoryIndex = categories.data?.findIndex((c) => c.slug === slug) ?? 0;

  const filters = {
    q: params.get('q') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    sale: params.get('sale') ?? '',
    inStock: params.get('inStock') ?? '',
    sort: params.get('sort') ?? 'popular',
    page: Number(params.get('page') ?? 1),
  };
  const result = useApi(`/products${queryString({ ...filters, category: slug, limit: 12 })}`);

  const [priceInput, setPriceInput] = useState({ min: filters.minPrice, max: filters.maxPrice });
  // Bộ lọc mở sẵn trên máy tính, thu gọn trên điện thoại
  const [filtersOpen, setFiltersOpen] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  useEffect(() => setPriceInput({ min: filters.minPrice, max: filters.maxPrice }), [filters.minPrice, filters.maxPrice]);

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ page: '', ...changes })) {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  const title = slug ? category?.name ?? 'Danh mục' : filters.q ? `Kết quả cho “${filters.q}”` : 'Tất cả sản phẩm';
  const banner = slug ? categoryStyle(slug, categoryIndex).color : 'var(--accent)';
  const hasFilters = filters.minPrice || filters.maxPrice || filters.sale || filters.inStock;

  if (slug && categories.data && !category) {
    return (
      <div className="container page">
        <div className="empty-state">
          <h1 style={{ fontSize: 28 }}>Không tìm thấy danh mục</h1>
          <Link to="/san-pham" className="btn btn-dark">Xem tất cả sản phẩm</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{slug ? category?.name ?? '…' : 'Sản phẩm'}</span>
      </nav>

      <section className="banner" style={{ background: banner }}>
        <div>
          <h1>{title}</h1>
          <p style={{ margin: 0 }}>{category?.description ?? 'Khám phá sản phẩm từ tất cả danh mục của KhangShop.'}</p>
        </div>
      </section>

      <div className="listing">
        <details className="card filters" open={filtersOpen} onToggle={(e) => setFiltersOpen(e.currentTarget.open)}>
          <summary>Bộ lọc{hasFilters ? ' (đang lọc)' : ''}</summary>
          <div className="stack" style={{ gap: 22 }}>
          {hasFilters && (
            <button type="button" className="link-btn" style={{ fontSize: 13, alignSelf: 'flex-start' }} onClick={() => update({ minPrice: '', maxPrice: '', sale: '', inStock: '' })}>
              Xóa bộ lọc
            </button>
          )}

          <fieldset>
            <legend>Khoảng giá</legend>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRICE_RANGES.map((r) => {
                const active = filters.minPrice === r.min && filters.maxPrice === r.max;
                return (
                  <button
                    key={r.label}
                    type="button"
                    className={`pill${active ? ' is-active' : ''}`}
                    style={{ height: 36, fontSize: 13 }}
                    aria-pressed={active}
                    onClick={() => update(active ? { minPrice: '', maxPrice: '' } : { minPrice: r.min, maxPrice: r.max })}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <form
              style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                update({ minPrice: priceInput.min, maxPrice: priceInput.max });
              }}
            >
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="gia-tu" style={{ fontSize: 12 }}>Từ (₫)</label>
                <input id="gia-tu" className="input" style={{ height: 42 }} type="number" min="0" step="1000" inputMode="numeric" value={priceInput.min} onChange={(e) => setPriceInput({ ...priceInput, min: e.target.value })} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="gia-den" style={{ fontSize: 12 }}>Đến (₫)</label>
                <input id="gia-den" className="input" style={{ height: 42 }} type="number" min="0" step="1000" inputMode="numeric" value={priceInput.max} onChange={(e) => setPriceInput({ ...priceInput, max: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-accent" style={{ height: 42, boxShadow: 'none' }}>
                Lọc
              </button>
            </form>
          </fieldset>

          <hr className="divider" />

          <fieldset>
            <legend>Khác</legend>
            <label className="check">
              <input type="checkbox" checked={filters.sale === '1'} onChange={(e) => update({ sale: e.target.checked ? '1' : '' })} />
              <span>Đang giảm giá</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={filters.inStock === '1'} onChange={(e) => update({ inStock: e.target.checked ? '1' : '' })} />
              <span>Còn hàng</span>
            </label>
          </fieldset>
          </div>
        </details>

        <section className="results" aria-label="Kết quả">
          <div className="toolbar">
            <p style={{ margin: 0 }} aria-live="polite">
              {result.data ? <>Tìm thấy <strong>{result.data.total}</strong> sản phẩm</> : ' '}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label htmlFor="sap-xep" style={{ fontSize: 14, fontWeight: 600 }}>Sắp xếp</label>
              <select id="sap-xep" className="select" style={{ height: 44, width: 'auto', fontWeight: 600, fontSize: 14 }} value={filters.sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {result.loading && <Loading />}
          <ErrorBox error={result.error} onRetry={result.reload} />
          {result.data && result.data.items.length === 0 && (
            <div className="empty-state">
              <h2 style={{ fontSize: 24 }}>Không có sản phẩm phù hợp</h2>
              <p className="muted" style={{ margin: 0 }}>Hãy thử bỏ bớt bộ lọc hoặc tìm với từ khóa khác.</p>
              <Link to="/san-pham" className="btn btn-dark">Xem tất cả sản phẩm</Link>
            </div>
          )}
          {result.data && result.data.items.length > 0 && (
            <>
              <div className="product-grid">
                {result.data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination
                page={result.data.page}
                pages={result.data.pages}
                onChange={(page) => {
                  update({ page: page > 1 ? page : '' });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
