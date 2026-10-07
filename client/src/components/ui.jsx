import Icon from './Icon.jsx';
import { STATUS, tintFor } from '../format.js';

export function ProductImage({ product, iconSize = 40, className = '' }) {
  return (
    <div className={`product-media ${className}`} style={{ background: product.imageUrl ? '#fff' : tintFor(product.id ?? product.productId) }}>
      {product.imageUrl ? (
        <img src={product.imageUrl} alt="" loading="lazy" />
      ) : (
        <Icon name="image" size={iconSize} strokeWidth={1.5} />
      )}
    </div>
  );
}

export function QtyStepper({ value, min = 1, max = 99, onChange, label }) {
  return (
    <div className="qty" role="group" aria-label={`Số lượng ${label}`}>
      <button type="button" aria-label="Giảm số lượng" onClick={() => onChange(value - 1)} disabled={value <= min}>
        <Icon name="minus" size={16} strokeWidth={2.8} />
      </button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label="Tăng số lượng" onClick={() => onChange(value + 1)} disabled={value >= max}>
        <Icon name="plus" size={16} strokeWidth={2.8} />
      </button>
    </div>
  );
}

export function StatusChip({ status, large = false }) {
  const s = STATUS[status] ?? { label: status, color: '#fff' };
  return (
    <span className="chip" style={{ background: s.color, ...(large && { height: 32, padding: '0 14px', fontSize: 14 }) }}>
      {s.label}
    </span>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pages || Math.abs(n - page) <= 1,
  );
  return (
    <nav className="pager" aria-label="Phân trang">
      <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <Icon name="chevronLeft" size={18} />
      </button>
      {numbers.map((n, i) => (
        <span key={n} style={{ display: 'contents' }}>
          {i > 0 && n - numbers[i - 1] > 1 && <span aria-hidden="true" style={{ alignSelf: 'center' }}>…</span>}
          <button type="button" aria-current={n === page ? 'page' : undefined} onClick={() => onChange(n)}>
            {n}
          </button>
        </span>
      ))}
      <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        <Icon name="chevronRight" size={18} />
      </button>
    </nav>
  );
}

export function CheckoutSteps({ current }) {
  const steps = ['Giỏ hàng', 'Thanh toán', 'Hoàn tất'];
  return (
    <ol className="steps" aria-label="Các bước đặt hàng">
      {steps.map((label, i) => {
        const state = i < current ? 'is-done' : i === current ? 'is-current' : '';
        return (
          <li key={label} className={state} aria-current={i === current ? 'step' : undefined} style={{ display: 'contents' }}>
            {i > 0 && <span className="bar" aria-hidden="true" />}
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }} className={state}>
              <span className="dot">{i < current ? <Icon name="check" size={16} strokeWidth={3} /> : i + 1}</span>
              <span>{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Loading({ text = 'Đang tải…' }) {
  return (
    <p className="loading" role="status">
      {text}
    </p>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" role="alert" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
      <span>{error.message || String(error)}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
