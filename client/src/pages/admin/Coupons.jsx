import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, Loading } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api } from '../../api.js';
import { formatVnd } from '../../format.js';

const EMPTY = { code: '', description: '', type: 'percent', value: '', maxDiscount: '', minOrder: '', usageLimit: '', startsOn: '', expiresOn: '', isActive: true };

const STATE = {
  dang_chay: { label: 'Đang chạy', color: 'var(--mint)' },
  chua_bat_dau: { label: 'Chưa bắt đầu', color: 'var(--sky)' },
  het_han: { label: 'Hết hạn', color: 'var(--gray)' },
  het_luot: { label: 'Hết lượt', color: 'var(--peach)' },
  tat: { label: 'Đang tắt', color: 'var(--gray)' },
};

const day = (value) => (value ? `${value.slice(8)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : null);

function discountText(c) {
  if (c.type === 'fixed') return `Giảm ${formatVnd(c.value)}`;
  return `Giảm ${c.value}%${c.maxDiscount ? `, tối đa ${formatVnd(c.maxDiscount)}` : ''}`;
}

export default function Coupons() {
  const list = useApi('/admin/coupons');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function startEdit(c) {
    setEditingId(c.id);
    setForm({
      code: c.code,
      description: c.description ?? '',
      type: c.type,
      value: String(c.value),
      maxDiscount: c.maxDiscount ? String(c.maxDiscount) : '',
      minOrder: c.minOrder ? String(c.minOrder) : '',
      usageLimit: c.usageLimit ? String(c.usageLimit) : '',
      startsOn: c.startsOn ?? '',
      expiresOn: c.expiresOn ?? '',
      isActive: c.isActive,
    });
    setError(null);
    setNotice('');
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function run(action, message) {
    setError(null);
    setBusy(true);
    try {
      await action();
      setNotice(message);
      list.reload();
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();
    const ok = await run(
      () => api(editingId ? `/admin/coupons/${editingId}` : '/admin/coupons', { method: editingId ? 'PUT' : 'POST', body: form }),
      editingId ? `Đã cập nhật mã ${code}` : `Đã thêm mã ${code}`,
    );
    if (ok) reset();
  }

  async function remove(c) {
    if (!window.confirm(`Xóa mã ${c.code}? Các đơn đã dùng mã vẫn giữ nguyên số tiền đã giảm.`)) return;
    const ok = await run(() => api(`/admin/coupons/${c.id}`, { method: 'DELETE' }), `Đã xóa mã ${c.code}`);
    if (ok && editingId === c.id) reset();
  }

  const toggle = (c) => run(
    () => api(`/admin/coupons/${c.id}/active`, { method: 'PATCH', body: { isActive: !c.isActive } }),
    c.isActive ? `Đã tắt mã ${c.code}` : `Đã bật mã ${c.code}`,
  );

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Mã giảm giá</h1>
          <p className="muted" style={{ margin: '2px 0 0' }}>Khách nhập mã ở trang thanh toán. Mã chỉ giảm trên tiền hàng, không giảm phí vận chuyển.</p>
        </div>
      </div>
      {notice && <p className="alert alert-success" role="status" style={{ margin: 0 }}>{notice}</p>}
      <ErrorBox error={error} />

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 }}>
        <section style={{ flex: '999 1 560px', minWidth: 0 }}>
          {list.loading && !list.data && <Loading />}
          <ErrorBox error={list.error} onRetry={list.reload} />
          {list.data && (
            <div className="table-wrap">
              <table className="data" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th scope="col">Mã</th>
                    <th scope="col">Ưu đãi</th>
                    <th scope="col" className="num">Đã dùng</th>
                    <th scope="col">Thời hạn</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col"><span className="visually-hidden">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((c) => (
                    <tr key={c.id} className={editingId === c.id ? 'is-selected' : undefined}>
                      <td><strong className="coupon-code" title={c.description ?? undefined}>{c.code}</strong></td>
                      <td>
                        {discountText(c)}
                        <span className="cell-sub">{c.minOrder ? `Đơn từ ${formatVnd(c.minOrder)}` : 'Mọi đơn hàng'}</span>
                      </td>
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{c.expiresOn ? `Đến ${day(c.expiresOn)}` : 'Không giới hạn'}{c.state === 'chua_bat_dau' && <span className="cell-sub">Từ {day(c.startsOn)}</span>}</td>
                      <td><span className="chip" style={{ background: STATE[c.state].color }}>{STATE[c.state].label}</span></td>
                      <td>
                        <span className="row-actions">
                          <button type="button" className="btn btn-icon btn-sm" aria-label={`Sửa mã ${c.code}`} onClick={() => startEdit(c)}><Icon name="edit" size={17} /></button>
                          <button type="button" className="btn btn-icon btn-sm" aria-label={c.isActive ? `Tắt mã ${c.code}` : `Bật mã ${c.code}`} disabled={busy} onClick={() => toggle(c)}>
                            <Icon name={c.isActive ? 'eyeOff' : 'eye'} size={17} />
                          </button>
                          <button type="button" className="btn btn-icon btn-sm" aria-label={`Xóa mã ${c.code}`} disabled={busy} onClick={() => remove(c)}><Icon name="trash" size={17} /></button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.data.length === 0 && <p className="muted" style={{ margin: 0, padding: '28px 16px', textAlign: 'center' }}>Chưa có mã giảm giá nào.</p>}
            </div>
          )}
        </section>

        <form className="card stack" style={{ flex: '1 1 340px', minWidth: 0, gap: 14 }} onSubmit={submit} aria-labelledby="mg-form-title">
          <h2 id="mg-form-title" style={{ fontSize: 20, fontWeight: 800 }}>{editingId ? 'Sửa mã giảm giá' : 'Thêm mã giảm giá'}</h2>
          <div className="field">
            <label htmlFor="mg-ma">Mã *</label>
            <input id="mg-ma" className="input" style={{ height: 46, textTransform: 'uppercase' }} required maxLength={30} placeholder="VD: KHANG10" value={form.code} onChange={set('code')} />
            <span className="field-hint">3–30 ký tự chữ không dấu hoặc số, viết liền</span>
          </div>
          <div className="field">
            <label htmlFor="mg-mota">Mô tả hiển thị cho khách</label>
            <input id="mg-mota" className="input" style={{ height: 46 }} maxLength={255} value={form.description} onChange={set('description')} />
          </div>
          <div className="form-grid" style={{ gap: 14 }}>
            <div className="field">
              <label htmlFor="mg-loai">Loại giảm *</label>
              <select id="mg-loai" className="select" style={{ height: 46 }} value={form.type} onChange={set('type')}>
                <option value="percent">Theo phần trăm</option>
                <option value="fixed">Số tiền cố định</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="mg-muc">{form.type === 'percent' ? 'Mức giảm (%) *' : 'Mức giảm (₫) *'}</label>
              <input id="mg-muc" className="input" style={{ height: 46 }} type="number" required min={form.type === 'percent' ? 1 : 1000} max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={set('value')} />
            </div>
            {form.type === 'percent' && (
              <div className="field">
                <label htmlFor="mg-toida">Giảm tối đa (₫)</label>
                <input id="mg-toida" className="input" style={{ height: 46 }} type="number" min="0" placeholder="Không giới hạn" value={form.maxDiscount} onChange={set('maxDiscount')} />
              </div>
            )}
            <div className="field">
              <label htmlFor="mg-toithieu">Đơn tối thiểu (₫)</label>
              <input id="mg-toithieu" className="input" style={{ height: 46 }} type="number" min="0" placeholder="0" value={form.minOrder} onChange={set('minOrder')} />
            </div>
            <div className="field">
              <label htmlFor="mg-luot">Giới hạn lượt dùng</label>
              <input id="mg-luot" className="input" style={{ height: 46 }} type="number" min="0" placeholder="Không giới hạn" value={form.usageLimit} onChange={set('usageLimit')} />
            </div>
            <div className="field">
              <label htmlFor="mg-tu">Bắt đầu từ ngày</label>
              <input id="mg-tu" className="input" style={{ height: 46 }} type="date" value={form.startsOn} onChange={set('startsOn')} />
            </div>
            <div className="field">
              <label htmlFor="mg-den">Hết hạn sau ngày</label>
              <input id="mg-den" className="input" style={{ height: 46 }} type="date" min={form.startsOn || undefined} value={form.expiresOn} onChange={set('expiresOn')} />
            </div>
          </div>
          <label className="check">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} />
            <span>Cho phép khách dùng mã này</span>
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-accent" style={{ flex: 2 }} disabled={busy}>{editingId ? 'Lưu thay đổi' : 'Thêm mã'}</button>
            {editingId && <button type="button" className="btn" style={{ flex: 1 }} onClick={reset}>Hủy</button>}
          </div>
        </form>
      </div>
    </>
  );
}
