import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, Loading, Pagination, StatusChip } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { api, queryString } from '../../api.js';
import { PAYMENT, SHIPPING, STATUS, formatDateTime, formatVnd } from '../../format.js';

const TABS = ['', 'cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy'];

const NEXT_ACTION = {
  cho_xac_nhan: ['da_xac_nhan', 'Xác nhận đơn hàng'],
  da_xac_nhan: ['dang_giao', 'Bàn giao cho vận chuyển'],
  dang_giao: ['da_giao', 'Xác nhận đã giao'],
};

function OrderDetail({ code, onChanged }) {
  const { data: order, error, loading, reload } = useApi(`/admin/orders/${code}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  useEffect(() => setActionError(null), [code]);

  async function changeStatus(status, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setActionError(null);
    try {
      await api(`/admin/orders/${code}/status`, { method: 'PATCH', body: { status } });
      reload();
      onChanged();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) return <div className="card"><Loading /></div>;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const next = NEXT_ACTION[order.status];
  const canCancel = ['cho_xac_nhan', 'da_xac_nhan'].includes(order.status);

  return (
    <div className="card stack printable" style={{ gap: 16 }}>
      <div className="summary-row" style={{ flexWrap: 'wrap' }}>
        <div>
          <span className="product-cat">Đơn hàng</span>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{order.code}</h2>
        </div>
        <StatusChip status={order.status} large />
      </div>
      <dl className="info-list" style={{ fontSize: 14, gridTemplateColumns: 'minmax(90px, auto) 1fr', gap: '8px 14px' }}>
        <dt>Khách hàng</dt><dd>{order.customerName}</dd>
        <dt>Điện thoại</dt><dd>{order.phone}</dd>
        {order.email && (<><dt>Email</dt><dd>{order.email}</dd></>)}
        <dt>Địa chỉ</dt><dd>{order.addressDetail}, {order.ward}, {order.province}</dd>
        <dt>Ngày đặt</dt><dd>{formatDateTime(order.createdAt)}</dd>
        <dt>Giao hàng</dt><dd>{SHIPPING[order.shippingMethod]?.label}</dd>
        <dt>Thanh toán</dt><dd>{PAYMENT[order.paymentMethod]?.label}</dd>
        {order.note && (<><dt>Ghi chú</dt><dd>{order.note}</dd></>)}
      </dl>
      <hr className="divider" />
      <ul className="mini-list" style={{ gap: 10 }}>
        {order.items.map((it, i) => (
          <li key={i} style={{ justifyContent: 'space-between', fontSize: 14 }}>
            <span style={{ minWidth: 0 }}><strong style={{ fontWeight: 600 }}>{it.name}</strong> <span className="muted">× {it.quantity}</span></span>
            <strong style={{ whiteSpace: 'nowrap' }}>{formatVnd(it.lineTotal)}</strong>
          </li>
        ))}
      </ul>
      <div className="stack" style={{ gap: 6, fontSize: 14 }}>
        <div className="summary-row"><span>Tạm tính</span><span>{formatVnd(order.subtotal)}</span></div>
        <div className="summary-row"><span>Phí vận chuyển</span><span>{formatVnd(order.shippingFee)}</span></div>
        <div className="summary-row"><strong style={{ fontSize: 15 }}>Tổng cộng</strong><strong style={{ fontSize: 22 }}>{formatVnd(order.total)}</strong></div>
      </div>
      <details style={{ fontSize: 14 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Lịch sử trạng thái</summary>
        <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
          {order.history.map((h, i) => (
            <li key={i}>{STATUS[h.status]?.label} — {formatDateTime(h.at)}</li>
          ))}
        </ul>
      </details>
      <ErrorBox error={actionError} />
      <div className="stack no-print" style={{ gap: 10 }}>
        {next && (
          <button type="button" className="btn btn-accent btn-lg btn-block" disabled={busy} onClick={() => changeStatus(next[0])}>
            <Icon name="check" strokeWidth={2.6} /> {next[1]}
          </button>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => window.print()}>
            <Icon name="printer" size={18} /> In đơn
          </button>
          {canCancel && (
            <button type="button" className="btn btn-pink" style={{ flex: 1 }} disabled={busy} onClick={() => changeStatus('da_huy', `Hủy đơn ${order.code}? Số lượng sản phẩm sẽ được hoàn lại kho.`)}>
              Hủy đơn
            </button>
          )}
        </div>
        {!next && !canCancel && <p className="muted" style={{ margin: 0, fontSize: 13, textAlign: 'center' }}>Đơn đã kết thúc, không thể đổi trạng thái.</p>}
      </div>
    </div>
  );
}

export default function Orders() {
  const { refreshPending } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? 1);
  const selected = params.get('ma');
  const [search, setSearch] = useState(q);
  const list = useApi(`/admin/orders${queryString({ status, q, page })}`);

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  const counts = list.data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Quản lý đơn hàng</h1>
          <p className="muted" style={{ margin: '2px 0 0' }}>Xác nhận, cập nhật trạng thái giao hàng và hủy đơn.</p>
        </div>
      </div>

      <div className="tabs" role="group" aria-label="Lọc theo trạng thái">
        {TABS.map((s) => (
          <button key={s || 'all'} type="button" aria-pressed={status === s} onClick={() => update({ status: s, page: '' })}>
            {s ? STATUS[s].label : 'Tất cả'}
            <span className="badge" style={{ background: s === 'cho_xac_nhan' && counts[s] ? 'var(--pink)' : '#fff' }}>
              {s ? counts[s] ?? 0 : total}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 }}>
        <section style={{ flex: '999 1 520px', minWidth: 0 }} className="stack" aria-label="Danh sách đơn hàng">
          <form
            role="search"
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: search.trim(), page: '' });
            }}
          >
            <Icon name="search" size={18} />
            <label htmlFor="dh-tim" className="visually-hidden">Tìm đơn hàng</label>
            <input id="dh-tim" type="search" placeholder="Tìm theo mã đơn, tên khách, số điện thoại rồi nhấn Enter" value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
          {list.loading && !list.data && <Loading />}
          <ErrorBox error={list.error} onRetry={list.reload} />
          {list.data && (
            <>
              <div className="table-wrap">
                <table className="data" style={{ minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th scope="col">Mã đơn</th>
                      <th scope="col">Khách hàng</th>
                      <th scope="col">Ngày đặt</th>
                      <th scope="col" className="num">Tổng tiền</th>
                      <th scope="col">Trạng thái</th>
                      <th scope="col"><span className="visually-hidden">Thao tác</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map((o) => (
                      <tr key={o.code} className={o.code === selected ? 'is-selected' : undefined}>
                        <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{o.code}</td>
                        <td>{o.customerName}<span className="cell-sub">{o.phone}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(o.createdAt)}</td>
                        <td className="num"><strong>{formatVnd(o.total)}</strong><span className="cell-sub">{o.paymentMethod === 'cod' ? 'COD' : 'Chuyển khoản'}</span></td>
                        <td><StatusChip status={o.status} /></td>
                        <td className="num">
                          <button type="button" className="btn btn-sm" aria-pressed={o.code === selected} aria-label={`Xem chi tiết đơn ${o.code}`} onClick={() => update({ ma: o.code })}>
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {list.data.items.length === 0 && <p className="muted" style={{ margin: 0, padding: '28px 16px', textAlign: 'center' }}>Không có đơn hàng phù hợp.</p>}
              </div>
              <Pagination page={list.data.page} pages={list.data.pages} onChange={(p) => update({ page: p > 1 ? p : '' })} />
            </>
          )}
        </section>

        <aside style={{ flex: '1 1 340px', minWidth: 0 }} aria-label="Chi tiết đơn hàng">
          {selected ? (
            <OrderDetail
              code={selected}
              onChanged={() => {
                list.reload();
                refreshPending();
              }}
            />
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <Icon name="receipt" size={36} />
              <p style={{ margin: 0 }}>Chọn một đơn hàng để xem chi tiết và cập nhật trạng thái.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
