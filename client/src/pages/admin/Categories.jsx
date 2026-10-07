import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, Loading } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../api.js';

const EMPTY = { name: '', description: '', sortOrder: '' };

export default function Categories() {
  const list = useApi('/admin/categories');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function startEdit(c) {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description ?? '', sortOrder: String(c.sortOrder) });
    setError(null);
    setNotice('');
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(editingId ? `/admin/categories/${editingId}` : '/admin/categories', {
        method: editingId ? 'PUT' : 'POST',
        body: form,
      });
      setNotice(editingId ? `Đã cập nhật danh mục "${form.name}"` : `Đã thêm danh mục "${form.name}"`);
      reset();
      list.reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Xóa danh mục "${c.name}"?`)) return;
    setError(null);
    try {
      await api(`/admin/categories/${c.id}`, { method: 'DELETE' });
      setNotice(`Đã xóa danh mục "${c.name}"`);
      if (editingId === c.id) reset();
      list.reload();
    } catch (err) {
      setError(err);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Danh mục sản phẩm</h1>
          <p className="muted" style={{ margin: '2px 0 0' }}>Danh mục hiển thị trên thanh điều hướng của cửa hàng theo thứ tự.</p>
        </div>
      </div>
      {notice && <p className="alert alert-success" role="status" style={{ margin: 0 }}>{notice}</p>}
      <ErrorBox error={error} />

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 }}>
        <section style={{ flex: '999 1 520px', minWidth: 0 }}>
          {list.loading && !list.data && <Loading />}
          <ErrorBox error={list.error} onRetry={list.reload} />
          {list.data && (
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th scope="col">Thứ tự</th>
                    <th scope="col">Tên danh mục</th>
                    <th scope="col">Đường dẫn</th>
                    <th scope="col" className="num">Sản phẩm</th>
                    <th scope="col"><span className="visually-hidden">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((c) => (
                    <tr key={c.id} className={editingId === c.id ? 'is-selected' : undefined}>
                      <td>{c.sortOrder}</td>
                      <td><strong style={{ fontWeight: 600 }}>{c.name}</strong>{c.description && <span className="cell-sub">{c.description}</span>}</td>
                      <td className="muted">/danh-muc/{c.slug}</td>
                      <td className="num">{c.productCount}</td>
                      <td>
                        <span className="row-actions">
                          <button type="button" className="btn btn-icon btn-sm" aria-label={`Sửa ${c.name}`} onClick={() => startEdit(c)}><Icon name="edit" size={17} /></button>
                          <button type="button" className="btn btn-icon btn-sm" aria-label={`Xóa ${c.name}`} onClick={() => remove(c)}><Icon name="trash" size={17} /></button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form className="card stack" style={{ flex: '1 1 320px', minWidth: 0, gap: 14 }} onSubmit={submit} aria-labelledby="dm-form-title">
          <h2 id="dm-form-title" style={{ fontSize: 20, fontWeight: 800 }}>{editingId ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>
          <div className="field">
            <label htmlFor="dm-ten">Tên danh mục *</label>
            <input id="dm-ten" className="input" style={{ height: 46 }} required value={form.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label htmlFor="dm-mota">Mô tả ngắn</label>
            <input id="dm-mota" className="input" style={{ height: 46 }} value={form.description} onChange={set('description')} />
          </div>
          <div className="field">
            <label htmlFor="dm-thutu">Thứ tự hiển thị</label>
            <input id="dm-thutu" className="input" style={{ height: 46 }} type="number" min="0" value={form.sortOrder} onChange={set('sortOrder')} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-accent" style={{ flex: 2 }} disabled={busy}>{editingId ? 'Lưu thay đổi' : 'Thêm danh mục'}</button>
            {editingId && <button type="button" className="btn" style={{ flex: 1 }} onClick={reset}>Hủy</button>}
          </div>
        </form>
      </div>
    </>
  );
}
