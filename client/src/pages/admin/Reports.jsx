import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { ErrorBox, Loading, ProductImage } from '../../components/ui.jsx';
import { useApi } from '../../hooks/useApi.js';
import { formatVnd } from '../../format.js';

// Ngày hôm nay theo giờ Việt Nam, dạng năm-tháng-ngày
const todayString = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

function shiftDays(day, delta) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: '7 ngày', range: (today) => [shiftDays(today, -6), today] },
  { label: '30 ngày', range: (today) => [shiftDays(today, -29), today] },
  { label: 'Tháng này', range: (today) => [`${today.slice(0, 8)}01`, today] },
  { label: '90 ngày', range: (today) => [shiftDays(today, -89), today] },
];

const periodLabel = (period) => (period.length === 7 ? `${period.slice(5)}/${period.slice(0, 4)}` : `${period.slice(8)}/${period.slice(5, 7)}`);
const compact = (value) => (value >= 1e6 ? `${(value / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr` : `${Math.round(value / 1e3)} k`);

// Làm tròn giá trị lớn nhất lên một mốc dễ đọc (1, 2, 5 × 10^n) để chia trục
function niceMax(value) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((m) => m * pow).find((m) => m >= value);
}

function Kpi({ label, value, sub, icon, color }) {
  return (
    <div className="kpi" style={{ background: color }}>
      <div className="kpi-label">
        <span>{label}</span>
        <span><Icon name={icon} size={18} strokeWidth={2.2} /></span>
      </div>
      <span className="kpi-value">{value}</span>
      <span style={{ fontSize: 13 }}>{sub}</span>
    </div>
  );
}

// Biểu đồ cột một chuỗi số liệu: giá trị đơn hàng theo ngày (hoặc theo tháng với khoảng dài)
function ValueChart({ series }) {
  const top = niceMax(Math.max(...series.map((s) => s.orderValue)));
  const peak = series.reduce((best, s, i) => (s.orderValue > series[best].orderValue ? i : best), 0);
  const labelStep = Math.ceil(series.length / 8);
  return (
    <div className="rchart" role="group" aria-label="Biểu đồ cột giá trị đơn hàng theo thời gian. Số liệu chi tiết ở bảng bên dưới.">
      <div className="rchart-axis" aria-hidden="true">
        {[top, top / 2, 0].map((tick) => <span key={tick}>{tick ? compact(tick) : '0'}</span>)}
      </div>
      <div className="rchart-plot" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }}>
        {series.map((s, i) => {
          const height = `${(s.orderValue / top) * 100}%`;
          // ô chú thích của các cột sát mép được neo vào mép để không tràn ra ngoài khung
          const edge = i < 3 ? ' tip-left' : i > series.length - 4 ? ' tip-right' : '';
          return (
            <div
              key={s.period}
              className={`rchart-col${edge}`}
              style={{ '--h': height }}
              tabIndex={0}
              aria-label={`${periodLabel(s.period)}: ${formatVnd(s.orderValue)}, ${s.orders} đơn`}
            >
              <span className="rchart-tip" role="tooltip">
                <strong>{formatVnd(s.orderValue)}</strong>
                <span>{periodLabel(s.period)} · {s.orders} đơn</span>
              </span>
              {i === peak && s.orderValue > 0 && <span className="rchart-peak" aria-hidden="true">{compact(s.orderValue)}</span>}
              {s.orderValue > 0 && <span className="rchart-bar" style={{ height }} />}
            </div>
          );
        })}
      </div>
      <div className="rchart-labels" style={{ gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))` }} aria-hidden="true">
        {/* đếm từ cột cuối để ngày gần nhất luôn có nhãn và các nhãn không chồng lên nhau */}
        {series.map((s, i) => <span key={s.period}>{(series.length - 1 - i) % labelStep === 0 ? periodLabel(s.period) : ''}</span>)}
      </div>
    </div>
  );
}

export default function Reports() {
  const [today] = useState(todayString);
  const [range, setRange] = useState(() => PRESETS[1].range(today));
  const [draft, setDraft] = useState(range);
  const [from, to] = range;
  const { data, error, loading, reload } = useApi(`/admin/reports/revenue?from=${from}&to=${to}`);

  function apply(next) {
    setDraft(next);
    setRange(next);
  }

  const s = data?.summary;
  const categoryTotal = data?.byCategory.reduce((sum, c) => sum + c.amount, 0) || 1;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>Thống kê doanh thu</h1>
          <p className="muted" style={{ margin: '2px 0 0' }}>Tính theo ngày đặt hàng. Doanh thu chỉ gồm các đơn đã giao.</p>
        </div>
      </div>

      <form
        className="card report-filter"
        onSubmit={(e) => {
          e.preventDefault();
          setRange(draft);
        }}
      >
        <div className="report-presets" role="group" aria-label="Khoảng thời gian có sẵn">
          {PRESETS.map((p) => {
            const value = p.range(today);
            const on = value[0] === from && value[1] === to;
            return (
              <button key={p.label} type="button" className={`btn btn-sm${on ? ' btn-dark' : ''}`} aria-pressed={on} onClick={() => apply(value)}>
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="field">
          <label htmlFor="tk-tu">Từ ngày</label>
          <input id="tk-tu" className="input" type="date" required max={draft[1]} value={draft[0]} onChange={(e) => setDraft([e.target.value, draft[1]])} />
        </div>
        <div className="field">
          <label htmlFor="tk-den">Đến ngày</label>
          <input id="tk-den" className="input" type="date" required min={draft[0]} max={today} value={draft[1]} onChange={(e) => setDraft([draft[0], e.target.value])} />
        </div>
        <button type="submit" className="btn btn-accent">Xem thống kê</button>
      </form>

      {loading && !data && <Loading />}
      <ErrorBox error={error} onRetry={reload} />

      {data && (
        <>
          <section className="kpi-grid" aria-label="Chỉ số trong khoảng thời gian đã chọn">
            <Kpi label="Doanh thu" value={formatVnd(s.revenue)} sub={`Từ ${s.delivered} đơn đã giao`} icon="trend" color="var(--accent)" />
            <Kpi label="Giá trị đơn hàng" value={formatVnd(s.orderValue)} sub={`${s.orders - s.cancelled} đơn, không tính đơn hủy`} icon="receipt" color="var(--mint)" />
            <Kpi label="Trung bình mỗi đơn" value={formatVnd(s.averageOrder)} sub={`Đã giảm giá ${formatVnd(s.discount)}`} icon="tag" color="var(--lilac)" />
            <Kpi label="Đơn bị hủy" value={s.cancelled} sub={s.orders ? `${Math.round((s.cancelled / s.orders) * 100)}% trên ${s.orders} đơn` : 'Chưa có đơn nào'} icon="alert" color="var(--peach)" />
          </section>

          <section className="card">
            <div className="summary-row" style={{ flexWrap: 'wrap', marginBottom: 18 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Giá trị đơn hàng theo {data.groupBy === 'month' ? 'tháng' : 'ngày'}</h2>
              <span className="muted" style={{ fontSize: 13 }}>{data.days} ngày · không tính đơn đã hủy</span>
            </div>
            {s.orders === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Không có đơn hàng nào trong khoảng thời gian này.</p>
            ) : (
              <ValueChart series={data.series} />
            )}
            <details className="report-table">
              <summary>Xem bảng số liệu</summary>
              <div className="table-wrap" style={{ boxShadow: 'none', marginTop: 12 }}>
                <table className="data" style={{ minWidth: 480 }}>
                  <thead>
                    <tr>
                      <th scope="col">{data.groupBy === 'month' ? 'Tháng' : 'Ngày'}</th>
                      <th scope="col" className="num">Số đơn</th>
                      <th scope="col" className="num">Giá trị đơn hàng</th>
                      <th scope="col" className="num">Doanh thu (đã giao)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.series.map((r) => (
                      <tr key={r.period}>
                        <td>{periodLabel(r.period)}</td>
                        <td className="num">{r.orders}</td>
                        <td className="num">{formatVnd(r.orderValue)}</td>
                        <td className="num">{formatVnd(r.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <section className="card" style={{ flex: '3 1 480px', minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Sản phẩm bán chạy</h2>
              {data.topProducts.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>Chưa có sản phẩm nào được bán trong khoảng này.</p>
              ) : (
                <div className="table-wrap" style={{ boxShadow: 'none' }}>
                  <table className="data" style={{ minWidth: 460 }}>
                    <thead>
                      <tr>
                        <th scope="col">Sản phẩm</th>
                        <th scope="col" className="num">Đã bán</th>
                        <th scope="col" className="num">Doanh số</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr key={`${p.sku}-${p.name}`}>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span className="thumb thumb-sm" style={{ width: 40, height: 40, flex: 'none' }}><ProductImage product={p} iconSize={16} /></span>
                              <span><strong style={{ fontWeight: 600 }}>{p.name}</strong><span className="cell-sub">{p.sku ?? 'Đã xóa'}</span></span>
                            </span>
                          </td>
                          <td className="num">{p.quantity}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{formatVnd(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card" style={{ flex: '2 1 320px', minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Doanh số theo danh mục</h2>
              {data.byCategory.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>Chưa có số liệu.</p>
              ) : (
                <ul className="cat-bars">
                  {data.byCategory.map((c) => (
                    <li key={c.name}>
                      <span className="cat-bars-head">
                        <span>{c.name}</span>
                        <strong>{formatVnd(c.amount)}</strong>
                      </span>
                      <span className="cat-bar" aria-hidden="true"><span style={{ width: `${(c.amount / data.byCategory[0].amount) * 100}%` }} /></span>
                      <span className="cell-sub">{Math.round((c.amount / categoryTotal) * 100)}% doanh số · {c.quantity} sản phẩm</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
