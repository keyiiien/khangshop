import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { ProductImage } from './ui.jsx';
import { useCart } from '../context/CartContext.jsx';
import { discountPercent, formatVnd } from '../format.js';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const url = `/san-pham/${product.slug}`;
  const soldOut = product.stock === 0;

  useEffect(() => {
    if (!added) return undefined;
    const timer = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <article className="product-card">
      <Link to={url} tabIndex={-1} aria-hidden="true" style={{ position: 'relative', display: 'block' }}>
        <ProductImage product={product} />
        {product.oldPrice && <span className="sticker" style={{ position: 'absolute', top: 12, left: 12, fontSize: 14 }}>-{discountPercent(product.price, product.oldPrice)}%</span>}
        {soldOut && <span className="chip" style={{ position: 'absolute', right: 12, bottom: 12 }}>Hết hàng</span>}
      </Link>
      <div className="product-body">
        <span className="product-cat">{product.category?.name}</span>
        <Link to={url} className="product-name">
          {product.name}
        </Link>
        <div className="price-row">
          <span className="price">{formatVnd(product.price)}</span>
          {product.oldPrice && <span className="price-old">{formatVnd(product.oldPrice)}</span>}
        </div>
        <button
          type="button"
          className="btn"
          disabled={soldOut}
          onClick={() => {
            add(product, 1);
            setAdded(true);
          }}
          aria-label={soldOut ? `${product.name} đã hết hàng` : `Thêm ${product.name} vào giỏ`}
          style={added ? { background: 'var(--mint)' } : undefined}
        >
          <Icon name={added ? 'check' : 'plus'} size={18} strokeWidth={2.6} />
          <span aria-live="polite">{soldOut ? 'Hết hàng' : added ? 'Đã thêm vào giỏ' : 'Thêm vào giỏ'}</span>
        </button>
      </div>
    </article>
  );
}
