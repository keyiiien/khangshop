import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from './Icon.jsx';
import { ProductImage } from './ui.jsx';
import { api } from '../api.js';
import { formatVnd } from '../format.js';

const MIN_CHARS = 2;
const LIMIT = 6;

// Bỏ dấu để so khớp: "nắng" -> "nang", "Đồng" -> "dong"
function fold(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

// Tô đậm các từ khóa trong tên sản phẩm, không phân biệt dấu
function Highlight({ text, query }) {
  const folded = [...text].map(fold);
  if (folded.some((c) => c.length !== 1)) return text;
  const hay = folded.join('');
  const marked = new Array(text.length).fill(false);
  for (const word of fold(query).split(/\s+/).filter(Boolean)) {
    for (let i = hay.indexOf(word); i !== -1; i = hay.indexOf(word, i + 1)) marked.fill(true, i, i + word.length);
  }
  const parts = [];
  for (let i = 0; i < text.length; ) {
    let j = i;
    while (j < text.length && marked[j] === marked[i]) j++;
    parts.push(marked[i] ? <mark key={i}>{text.slice(i, j)}</mark> : text.slice(i, j));
    i = j;
  }
  return parts;
}

export default function SearchBox() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null); // { query, items, total }
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const listId = useId();
  const query = q.trim();

  // Chờ người dùng ngừng gõ 250ms rồi mới gọi API gợi ý
  useEffect(() => {
    if (query.length < MIN_CHARS) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      api(`/products?q=${encodeURIComponent(query)}&limit=${LIMIT}`)
        .then((data) => alive && setResult({ query, items: data.items, total: data.total }))
        .catch(() => alive && setResult({ query, items: [], total: 0 }));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Chuyển trang thì đóng gợi ý
  useEffect(() => setOpen(false), [location.pathname, location.search]);

  // Bấm ra ngoài thì đóng gợi ý
  useEffect(() => {
    function onPointerDown(e) {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const ready = result?.query === query ? result : null;
  const items = ready?.items ?? [];
  const show = open && query.length >= MIN_CHARS;
  const allUrl = `/san-pham?q=${encodeURIComponent(query)}`;

  function submit(e) {
    e.preventDefault();
    setOpen(false);
    navigate(query ? allUrl : '/san-pham');
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!show || items.length === 0) return;
    // Vị trí 0..n-1 là sản phẩm, n là dòng "Xem tất cả"
    const last = items.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i >= last ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? last : i - 1));
    } else if (e.key === 'Enter' && active >= 0 && active < items.length) {
      e.preventDefault();
      navigate(`/san-pham/${items[active].slug}`);
    }
  }

  return (
    <div className="header-search-wrap" ref={boxRef}>
      <form className="header-search" role="search" onSubmit={submit}>
        <label htmlFor="header-q" className="visually-hidden">
          Tìm kiếm sản phẩm
        </label>
        <input
          id="header-q"
          type="search"
          placeholder="Hôm nay bạn muốn săn gì?"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={show}
          aria-controls={listId}
          aria-activedescendant={show && active >= 0 && active < items.length ? `${listId}-${active}` : undefined}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" aria-label="Tìm kiếm">
          <Icon name="search" size={20} strokeWidth={2.4} />
        </button>
      </form>

      {show && (
        <div className="suggest">
          {!ready && <p className="suggest-note">Đang tìm…</p>}
          {ready && items.length === 0 && (
            <p className="suggest-note">
              Không tìm thấy sản phẩm cho “{query}”. Thử từ khóa ngắn hơn hoặc bỏ bớt từ.
            </p>
          )}
          {items.length > 0 && (
            <>
              <p className="suggest-head">Sản phẩm gợi ý</p>
              <ul id={listId} role="listbox" aria-label="Sản phẩm gợi ý">
                {items.map((p, i) => (
                  <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                    <Link
                      to={`/san-pham/${p.slug}`}
                      tabIndex={-1}
                      className={`suggest-item${i === active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                    >
                      <ProductImage product={p} iconSize={20} className="suggest-thumb" />
                      <span className="suggest-info">
                        <span className="suggest-name">
                          <Highlight text={p.name} query={query} />
                        </span>
                        <span className="suggest-cat">{p.category?.name}</span>
                      </span>
                      <span className="suggest-price">
                        {p.stock === 0 ? <span className="suggest-out">Hết hàng</span> : formatVnd(p.price)}
                        {p.stock > 0 && p.oldPrice && <s>{formatVnd(p.oldPrice)}</s>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to={allUrl}
                className={`suggest-all${active === items.length ? ' is-active' : ''}`}
                onMouseEnter={() => setActive(items.length)}
              >
                Xem tất cả {ready.total} kết quả cho “{query}” <Icon name="arrowRight" size={16} />
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
