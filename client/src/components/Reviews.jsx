import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ErrorBox, Loading, Pagination, Stars } from './ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../api.js';
import { formatDate } from '../format.js';

const RATING_TEXT = { 1: 'Rất tệ', 2: 'Chưa tốt', 3: 'Tạm được', 4: 'Hài lòng', 5: 'Rất hài lòng' };

// Chọn số sao bằng chuột hoặc bàn phím (nhóm nút radio)
function StarPicker({ value, onChange }) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Số sao đánh giá">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao – ${RATING_TEXT[n]}`}
          className={n <= value ? 'is-on' : undefined}
          onClick={() => onChange(n)}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="m12 2.8 2.9 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9z"
              fill={n <= value ? 'var(--accent)' : '#fff'}
              stroke="var(--ink)"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
      <span className="star-picker-text">{value ? RATING_TEXT[value] : 'Chọn số sao'}</span>
    </div>
  );
}

function ReviewForm({ slug, mine, onSaved }) {
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [comment, setComment] = useState(mine?.comment ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRating(mine?.rating ?? 0);
    setComment(mine?.comment ?? '');
  }, [mine?.id, mine?.rating, mine?.comment]);

  async function submit(e) {
    e.preventDefault();
    if (!rating) {
      setError('Vui lòng chọn số sao');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api(`/products/${slug}/reviews`, { method: 'POST', body: { rating, comment } });
      onSaved(mine ? 'Đã cập nhật đánh giá của bạn' : 'Cảm ơn bạn đã đánh giá sản phẩm');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Xóa đánh giá của bạn?')) return;
    setBusy(true);
    try {
      await api(`/products/${slug}/reviews/mine`, { method: 'DELETE' });
      onSaved('Đã xóa đánh giá của bạn');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="review-form stack" onSubmit={submit} aria-labelledby="dg-form-title">
      <h3 id="dg-form-title">{mine ? 'Sửa đánh giá của bạn' : 'Viết đánh giá'}</h3>
      <StarPicker value={rating} onChange={(n) => { setRating(n); setError(''); }} />
      <div className="field">
        <label htmlFor="dg-nhan-xet">Nhận xét (không bắt buộc)</label>
        <textarea
          id="dg-nhan-xet"
          className="textarea"
          rows={3}
          maxLength={1000}
          placeholder="Sản phẩm dùng thế nào, có đúng mô tả không?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      {error && <p className="alert alert-error" role="alert" style={{ margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button type="submit" className="btn btn-accent" disabled={busy}>{mine ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</button>
        {mine && <button type="button" className="btn" disabled={busy} onClick={remove}>Xóa đánh giá</button>}
      </div>
    </form>
  );
}

export default function Reviews({ slug, onChange }) {
  const { user } = useAuth();
  const location = useLocation();
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');
  // user?.id trong đường dẫn để tải lại khi đăng nhập / đăng xuất (quyền đánh giá thay đổi)
  const { data, error, loading, reload } = useApi(`/products/${slug}/reviews?page=${page}&u=${user?.id ?? 0}`);

  useEffect(() => {
    setPage(1);
    setNotice('');
  }, [slug]);

  function saved(message) {
    setNotice(message);
    setPage(1);
    reload();
    onChange?.();   // điểm trung bình ở đầu trang chi tiết cũng thay đổi
  }

  const summary = data?.summary;
  return (
    <section id="danh-gia" className="section card" aria-labelledby="h-danh-gia">
      <h2 id="h-danh-gia" style={{ fontSize: 24, fontWeight: 800, marginBottom: 18 }}>Đánh giá sản phẩm</h2>
      {loading && !data && <Loading />}
      <ErrorBox error={error} onRetry={reload} />
      {data && (
        <div className="reviews">
          <div className="review-side stack">
            <div className="review-score">
              {summary.count > 0 ? (
                <>
                  <span className="review-avg">{summary.average.toLocaleString('vi-VN')}</span>
                  <span className="stack" style={{ gap: 4 }}>
                    <Stars value={summary.average} size={20} />
                    <span className="muted" style={{ fontSize: 14 }}>{summary.count} đánh giá</span>
                  </span>
                </>
              ) : (
                <span className="muted">Chưa có đánh giá nào cho sản phẩm này.</span>
              )}
            </div>
            {summary.count > 0 && (
              <ul className="review-bars" aria-label="Số đánh giá theo số sao">
                {[5, 4, 3, 2, 1].map((n) => (
                  <li key={n}>
                    <span>{n} sao</span>
                    <span className="review-bar" aria-hidden="true">
                      <span style={{ width: `${(summary.distribution[n] / summary.count) * 100}%` }} />
                    </span>
                    <span className="num">{summary.distribution[n]}</span>
                  </li>
                ))}
              </ul>
            )}

            {notice && <p className="alert alert-success" role="status" style={{ margin: 0 }}>{notice}</p>}
            {data.canReview && <ReviewForm slug={slug} mine={data.mine} onSaved={saved} />}
            {!data.canReview && data.reason === 'login' && (
              <p className="alert alert-info" style={{ margin: 0 }}>
                <Link to="/dang-nhap" state={{ from: location.pathname }} style={{ fontWeight: 700 }}>Đăng nhập</Link> để đánh giá sản
                phẩm bạn đã mua.
              </p>
            )}
            {!data.canReview && data.reason === 'not_purchased' && (
              <p className="alert alert-info" style={{ margin: 0 }}>
                Chỉ khách đã nhận hàng thành công mới đánh giá được sản phẩm này.
              </p>
            )}
          </div>

          <div className="review-list">
            {data.items.length === 0 && <p className="muted" style={{ margin: 0 }}>Hãy là người đầu tiên đánh giá sản phẩm này sau khi mua hàng.</p>}
            <ul>
              {data.items.map((r) => (
                <li key={r.id} className="review-item">
                  <div className="review-head">
                    <strong>{r.author}</strong>
                    {r.mine && <span className="chip" style={{ background: 'var(--mint)' }}>Đánh giá của bạn</span>}
                    <span className="muted" style={{ marginLeft: 'auto', fontSize: 13 }}>{formatDate(r.createdAt)}</span>
                  </div>
                  <Stars value={r.rating} size={16} label={`${r.rating} trên 5 sao`} />
                  {r.comment && <p>{r.comment}</p>}
                </li>
              ))}
            </ul>
            <Pagination page={data.page} pages={data.pages} onChange={setPage} />
          </div>
        </div>
      )}
    </section>
  );
}
