import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, Loading, Pagination, ProductImage } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, queryString } from '../../api.js';
import { LOW_STOCK, formatVnd } from '../../format.js';

const EMPTY = { name: '', sku: '', categoryId: '', price: '', oldPrice: '', stock: '', description: '', isVisible: true };

function ProductForm({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(
      product
        ? {
            name: product.name,
            sku: product.sku,
            categoryId: String(product.category.id),
            price: String(product.price),
            oldPrice: product.oldPrice ? String(product.oldPrice) : '',
            stock: String(product.stock),
            description: product.description ?? '',
            isVisible: product.isVisible,
          }
        : EMPTY,
    );
    setFile(null);
    setRemoveImage(false);
    setError(null);
  }, [product]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const currentImage = preview ?? (!removeImage && product?.imageUrl);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData();
    for (const [key, value] of Object.entries(form)) data.append(key, String(value));
    if (file) data.append('image', file);
    if (removeImage) data.append('removeImage', 'true');
    try {
      const saved = await api(product ? `/admin/products/${product.id}` : '/admin/products', { method: product ? 'PUT' : 'POST', form: data });
      onSaved(saved, product ? 'Đã lưu thay đổi sản phẩm' : 'Đã thêm sản phẩm mới');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" style={{ gap: 16 }} onSubmit={submit} aria-labelledby="sp-form-title">
      <div className="summary-row" style={{ alignItems: 'flex-start' }}>
        <h2 id="sp-form-title" style={{ fontSize: 21, fontWeight: 800 }}>{product ? `Sửa sản phẩm · ${product.sku}` : 'Thêm sản phẩm mới'}</h2>
        <button type="button" className="btn btn-icon btn-sm" aria-label="Đóng biểu mẫu" onClick={onClose}><Icon name="close" size={16} strokeWidth={2.6} /></button>
      </div>
      <div className="field">
        <label htmlFor="sp-ten">Tên sản phẩm *</label>
        <input id="sp-ten" className="input" style={{ height: 46 }} required value={form.name} onChange={set('name')} />
      </div>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        <div className="field">
          <label htmlFor="sp-ma">Mã sản phẩm</label>
          <input id="sp-ma" className="input input-upper" style={{ height: 46 }} placeholder="Tự tạo nếu để trống" value={form.sku} onChange={set('sku')} />
        </div>
        <div className="field">
          <label htmlFor="sp-dm">Danh mục *</label>
          <select id="sp-dm" className="select" style={{ height: 46 }} required value={form.categoryId} onChange={set('categoryId')}>
            <option value="">Chọn danh mục</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sp-gia">Giá bán (₫) *</label>
          <input id="sp-gia" className="input" style={{ height: 46 }} type="number" min="1000" step="1000" required value={form.price} onChange={set('price')} />
        </div>
        <div className="field">
          <label htmlFor="sp-giagoc">Giá gốc (₫)</label>
          <input id="sp-giagoc" className="input" style={{ height: 46 }} type="number" min="0" step="1000" placeholder="Để trống nếu không giảm" value={form.oldPrice} onChange={set('oldPrice')} />
        </div>
        <div className="field">
          <label htmlFor="sp-ton">Tồn kho *</label>
          <input id="sp-ton" className="input" style={{ height: 46 }} type="number" min="0" required value={form.stock} onChange={set('stock')} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="sp-mota">Mô tả sản phẩm</label>
        <textarea id="sp-mota" className="textarea" rows={4} value={form.description} onChange={set('description')} />
      </div>
      <div className="field">
        <span className="field-label">Ảnh sản phẩm</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {currentImage && (
            <span className="preview"><img src={currentImage} alt="Ảnh sản phẩm hiện tại" /></span>
          )}
          <label className="dropzone" style={{ flex: '1 1 180px' }}>
            <Icon name="upload" size={24} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{file ? file.name : 'Bấm để chọn ảnh'}</span>
            <span className="field-hint">JPG, PNG, WEBP · tối đa 2MB</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="visually-hidden"
              onChange={(e) => {
                setFile(e.target.files[0] ?? null);
                setRemoveImage(false);
              }}
            />
          </label>
        </div>
        {product?.imageUrl && !file && (
          <label className="check" style={{ marginTop: 4 }}>
            <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
            <span>Xóa ảnh hiện tại</span>
          </label>
        )}
      </div>
      <div className="summary-row" style={{ border: 'var(--border)', borderRadius: 14, padding: '12px 14px' }}>
        <span id="sp-hien-thi" style={{ fontWeight: 600, fontSize: 14 }}>Hiển thị trên cửa hàng</span>
        <button type="button" role="switch" className="switch" aria-checked={form.isVisible} aria-labelledby="sp-hien-thi" onClick={() => setForm({ ...form, isVisible: !form.isVisible })}>
          <span />
        </button>
      </div>
      <ErrorBox error={error} />
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" className="btn btn-accent btn-lg" style={{ flex: 2 }} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu sản phẩm'}</button>
        <button type="button" className="btn btn-lg" style={{ flex: 1 }} onClick={onClose}>Hủy</button>
      </div>
    </form>
  );
}

function stockChip(stock) {
  if (stock === 0) return <span className="chip" style={{ background: 'var(--pink)' }}>Hết hàng</span>;
  if (stock <= LOW_STOCK) return <span className="chip" style={{ background: 'var(--lemon)' }}>Còn {stock}</span>;
  return <span className="chip">{stock}</span>;
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const categoryId = params.get('categoryId') ?? '';
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? 1);
  const [search, setSearch] = useState(q);
  const [editing, setEditing] = useState(null); // null: đóng, 'new': thêm mới, object: đang sửa
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState(null);
  const categories = useApi('/admin/categories');
  const list = useApi(`/admin/products${queryString({ q, categoryId, status, page })}`);

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ page: '', ...changes })) {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  async function toggleVisible(p) {
    setActionError(null);
    try {
      await api(`/admin/products/${p.id}/visibility`, { method: 'PATCH', body: { isVisible: !p.isVisible } });
      list.reload();
    } catch (err) {
      setActionError(err);
    }
  }

  async function removeProduct(p) {
    if (!window.confirm(`Xóa vĩnh viễn "${p.name}"? Các đơn hàng cũ vẫn giữ tên và giá sản phẩm.`)) return;
    setActionError(null);
    try {
      await api(`/admin/products/${p.id}`, { method: 'DELETE' });
      if (editing?.id === p.id) setEditing(null);
      setNotice(`Đã xóa "${p.name}"`);
      list.reload();
    } catch (err) {
      setActionError(err);
    }
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Quản lý sản phẩm</h1>
          <p className="muted" style={{ margin: '2px 0 0' }}>Thêm, sửa, ẩn sản phẩm và theo dõi tồn kho.</p>
        </div>
        <button type="button" className="btn btn-accent" onClick={() => { setEditing('new'); setNotice(''); }}>
          <Icon name="plus" size={18} strokeWidth={2.8} /> Thêm sản phẩm
        </button>
      </div>

      {notice && <p className="alert alert-success" role="status" style={{ margin: 0 }}>{notice}</p>}
      <ErrorBox error={actionError} />

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 }}>
        <section className="stack" style={{ flex: '999 1 540px', minWidth: 0 }} aria-label="Danh sách sản phẩm">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <form role="search" className="search-box" style={{ flex: '1 1 240px' }} onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}>
              <Icon name="search" size={18} />
              <label htmlFor="sp-tim" className="visually-hidden">Tìm sản phẩm</label>
              <input id="sp-tim" type="search" placeholder="Tìm theo tên hoặc mã rồi nhấn Enter" value={search} onChange={(e) => setSearch(e.target.value)} />
            </form>
            <label htmlFor="sp-loc-dm" className="visually-hidden">Lọc theo danh mục</label>
            <select id="sp-loc-dm" className="select" style={{ width: 'auto', height: 46, fontSize: 14, fontWeight: 600 }} value={categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
              <option value="">Tất cả danh mục</option>
              {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <label htmlFor="sp-loc-tt" className="visually-hidden">Lọc theo trạng thái</label>
            <select id="sp-loc-tt" className="select" style={{ width: 'auto', height: 46, fontSize: 14, fontWeight: 600 }} value={status} onChange={(e) => update({ status: e.target.value })}>
              <option value="">Mọi trạng thái</option>
              <option value="visible">Đang bán</option>
              <option value="hidden">Đang ẩn</option>
              <option value="low">Tồn kho ≤ 5</option>
              <option value="out">Hết hàng</option>
            </select>
          </div>

          {list.loading && !list.data && <Loading />}
          <ErrorBox error={list.error} onRetry={list.reload} />
          {list.data && (
            <>
              <div className="table-wrap">
                <table className="data" style={{ minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th scope="col">Sản phẩm</th>
                      <th scope="col">Danh mục</th>
                      <th scope="col" className="num">Giá bán</th>
                      <th scope="col">Tồn kho</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col"><span className="visually-hidden">Thao tác</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map((p) => (
                      <tr key={p.id} className={editing?.id === p.id ? 'is-selected' : undefined}>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 230 }}>
                            <span className="thumb thumb-sm" style={{ width: 44, height: 44 }}><ProductImage product={p} iconSize={18} /></span>
                            <span style={{ minWidth: 0 }}><strong style={{ fontWeight: 600 }}>{p.name}</strong><span className="cell-sub">{p.sku}</span></span>
                          </span>
                        </td>
                        <td>{p.category.name}</td>
                        <td className="num"><strong>{formatVnd(p.price)}</strong>{p.oldPrice && <span className="cell-sub" style={{ textDecoration: 'line-through' }}>{formatVnd(p.oldPrice)}</span>}</td>
                        <td>{stockChip(p.stock)}</td>
                        <td><span className="chip" style={{ background: p.isVisible ? 'var(--mint)' : 'var(--gray)' }}>{p.isVisible ? 'Đang bán' : 'Đang ẩn'}</span></td>
                        <td>
                          <span className="row-actions">
                            <button type="button" className="btn btn-icon btn-sm" aria-label={`Sửa ${p.name}`} onClick={() => { setEditing(p); setNotice(''); }}><Icon name="edit" size={17} /></button>
                            <button type="button" className="btn btn-icon btn-sm" aria-label={p.isVisible ? `Ẩn ${p.name}` : `Hiện ${p.name}`} onClick={() => toggleVisible(p)}>
                              <Icon name={p.isVisible ? 'eyeOff' : 'eye'} size={17} />
                            </button>
                            <button type="button" className="btn btn-icon btn-sm" aria-label={`Xóa ${p.name}`} onClick={() => removeProduct(p)}><Icon name="trash" size={17} /></button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {list.data.items.length === 0 && <p className="muted" style={{ margin: 0, padding: '28px 16px', textAlign: 'center' }}>Không có sản phẩm phù hợp.</p>}
              </div>
              <div className="summary-row" style={{ flexWrap: 'wrap' }}>
                <span className="muted" style={{ fontSize: 13 }}>Tổng cộng {list.data.total} sản phẩm</span>
                <Pagination page={list.data.page} pages={list.data.pages} onChange={(p) => update({ page: p > 1 ? p : '' })} />
              </div>
            </>
          )}
        </section>

        {editing && categories.data && (
          <aside style={{ flex: '1 1 360px', minWidth: 0 }}>
            <ProductForm
              product={editing === 'new' ? null : editing}
              categories={categories.data}
              onClose={() => setEditing(null)}
              onSaved={(saved, message) => {
                setEditing(null);
                setNotice(`${message}: ${saved.name}`);
                list.reload();
              }}
            />
          </aside>
        )}
      </div>
    </>
  );
}
