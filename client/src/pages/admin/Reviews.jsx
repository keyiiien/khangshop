import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, Loading, Pagination, ProductImage, Stars } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../api.js';
import { formatDate } from '../../format.js';

export default function AdminReviews() {
  const [filters, setFilters] = useState({ q: '', rating: '', page: 1 });
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const query = new URLSearchParams({ page: filters.page, ...(filters.q && { q: filters.q }), ...(filters.rating && { rating: filters.rating }) });
  const list = useApi(`/admin/reviews?${query}`);

  const update = (changes) => setFilters({ ...filters, page: 1, ...changes });

  async function remove(r) {
    if (!window.confirm(`Xóa đánh giá của ${r.user.fullName} về "${r.product.name}"?`)) return;
    setError(null);
    try {
      await api(`/admin/reviews/${r.id}`, { method: 'DELETE' });
      setNotice(`Đã xóa đánh giá của ${r.user.fullName}`);
      list.reload();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Đánh giá sản phẩm</h1>
          <p className="muted" style={{ margin: '2px 0 0' }}>Đánh giá do khách đã nhận hàng gửi. Xóa những đánh giá có nội dung không phù hợp.</p>
        </div>
      </div>
      {notice && <p className="alert alert-success" role="status" style={{ margin: 0 }}>{notice}</p>}
      <ErrorBox error={error} />

      <div className="toolbar">
        <form role="search" className="search-box" style={{ flex: '1 1 260px' }} onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() }); }}>
          <Icon name="search" size={18} />
          <label htmlFor="dg-tim" className="visually-hidden">Tìm đánh giá</label>
          <input id="dg-tim" type="search" placeholder="Tìm theo sản phẩm, khách hàng, nội dung rồi nhấn Enter" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <label htmlFor="dg-sao" className="visually-hidden">Lọc theo số sao</label>
        <select id="dg-sao" className="select" style={{ width: 'auto', height: 48 }} value={filters.rating} onChange={(e) => update({ rating: e.target.value })}>
          <option value="">Mọi số sao</option>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
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
                  <th scope="col">Khách hàng</th>
                  <th scope="col">Đánh giá</th>
                  <th scope="col">Ngày</th>
                  <th scope="col"><span className="visually-hidden">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 260 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span className="thumb thumb-sm" style={{ width: 40, height: 40, flex: 'none' }}><ProductImage product={r.product} iconSize={16} /></span>
                        <Link to={`/san-pham/${r.product.slug}`} style={{ fontWeight: 600 }}>{r.product.name}</Link>
                      </span>
                    </td>
                    <td>{r.user.fullName}<span className="cell-sub">{r.user.email}</span></td>
                    <td style={{ maxWidth: 360 }}>
                      <Stars value={r.rating} size={15} label={`${r.rating} trên 5 sao`} />
                      {r.comment && <span className="cell-sub" style={{ color: 'var(--ink)' }}>{r.comment}</span>}
                    </td>
                    <td className="muted">{formatDate(r.createdAt)}</td>
                    <td>
                      <span className="row-actions">
                        <button type="button" className="btn btn-icon btn-sm" aria-label={`Xóa đánh giá của ${r.user.fullName}`} onClick={() => remove(r)}><Icon name="trash" size={17} /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.data.items.length === 0 && <p className="muted" style={{ margin: 0, padding: '28px 16px', textAlign: 'center' }}>Không có đánh giá nào phù hợp.</p>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span className="muted" style={{ fontSize: 14 }}>{list.data.total} đánh giá</span>
            <Pagination page={list.data.page} pages={list.data.pages} onChange={(page) => setFilters({ ...filters, page })} />
          </div>
        </>
      )}
    </>
  );
}
