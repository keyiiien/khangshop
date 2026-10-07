import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const BENEFITS = [
  'Lưu thông tin nhận hàng, đặt hàng nhanh hơn',
  'Xem lịch sử và trạng thái mọi đơn hàng',
  'Theo dõi đơn hàng mà không cần nhập lại mã',
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { user, login, register } = useAuth();
  const tab = params.get('tab') === 'dang-ky' ? 'register' : 'login';
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [regForm, setRegForm] = useState({ fullName: '', phone: '', email: '', password: '', confirm: '', agree: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from;
  if (user) return <Navigate to={from ?? (user.role === 'admin' ? '/quan-tri' : '/')} replace />;

  function switchTab(next) {
    setError('');
    setParams(next === 'register' ? { tab: 'dang-ky' } : {}, { replace: true, state: location.state });
  }

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      const u = await action();
      navigate(from ?? (u.role === 'admin' ? '/quan-tri' : '/'), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  function submitLogin(e) {
    e.preventDefault();
    run(() => login(loginForm.login, loginForm.password));
  }

  function submitRegister(e) {
    e.preventDefault();
    if (regForm.password !== regForm.confirm) return setError('Mật khẩu nhập lại không khớp');
    if (!regForm.agree) return setError('Bạn cần đồng ý với điều khoản sử dụng');
    const { confirm, agree, ...body } = regForm;
    run(() => register(body));
  }

  const setL = (key) => (e) => setLoginForm({ ...loginForm, [key]: e.target.value });
  const setR = (key) => (e) => setRegForm({ ...regForm, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="container page">
      <div className="auth">
        <section className="auth-aside">
          <div>
            <span className="sticker" style={{ fontSize: 13, letterSpacing: '0.06em', transform: 'rotate(-3deg)' }}>ĐĂNG KÝ MIỄN PHÍ</span>
            <h1>Mua sắm nhanh hơn với tài khoản KhangShop</h1>
          </div>
          <ul className="check-list">
            {BENEFITS.map((b) => (
              <li key={b}>
                <span className="tick"><Icon name="check" size={16} strokeWidth={3} /></span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card auth-form stack" style={{ gap: 22 }}>
          <div className="segmented" role="group" aria-label="Chọn đăng nhập hoặc đăng ký">
            <button type="button" aria-pressed={tab === 'login'} onClick={() => switchTab('login')}>Đăng nhập</button>
            <button type="button" aria-pressed={tab === 'register'} onClick={() => switchTab('register')}>Đăng ký</button>
          </div>

          {error && <p className="alert alert-error" role="alert" style={{ margin: 0 }}>{error}</p>}

          {tab === 'login' ? (
            <form className="stack" style={{ gap: 18 }} onSubmit={submitLogin}>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Chào mừng trở lại!</h2>
                <p className="muted" style={{ margin: 0 }}>Đăng nhập để tiếp tục mua sắm.</p>
              </div>
              <div className="field">
                <label htmlFor="dn-tk">Email hoặc số điện thoại</label>
                <input id="dn-tk" className="input" autoComplete="username" required value={loginForm.login} onChange={setL('login')} />
              </div>
              <div className="field">
                <label htmlFor="dn-mk">Mật khẩu</label>
                <input id="dn-mk" className="input" type="password" autoComplete="current-password" required value={loginForm.password} onChange={setL('password')} />
              </div>
              <button type="submit" className="btn btn-dark btn-lg btn-block" disabled={busy}>
                {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
              <p style={{ margin: 0, textAlign: 'center', fontSize: 14 }}>
                Chưa có tài khoản?{' '}
                <button type="button" className="link-btn" onClick={() => switchTab('register')}>Đăng ký ngay</button>
              </p>
            </form>
          ) : (
            <form className="stack" style={{ gap: 16 }} onSubmit={submitRegister}>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Tạo tài khoản mới</h2>
                <p className="muted" style={{ margin: 0 }}>Chỉ mất chưa đến một phút.</p>
              </div>
              <div className="field">
                <label htmlFor="dk-ten">Họ và tên</label>
                <input id="dk-ten" className="input" autoComplete="name" required value={regForm.fullName} onChange={setR('fullName')} />
              </div>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <div className="field">
                  <label htmlFor="dk-sdt">Số điện thoại</label>
                  <input id="dk-sdt" className="input" type="tel" autoComplete="tel" required value={regForm.phone} onChange={setR('phone')} />
                </div>
                <div className="field">
                  <label htmlFor="dk-email">Email</label>
                  <input id="dk-email" className="input" type="email" autoComplete="email" required value={regForm.email} onChange={setR('email')} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="dk-mk">Mật khẩu</label>
                <input id="dk-mk" className="input" type="password" autoComplete="new-password" required minLength={8} aria-describedby="dk-mk-goi-y" value={regForm.password} onChange={setR('password')} />
                <span id="dk-mk-goi-y" className="field-hint">Tối thiểu 8 ký tự, gồm cả chữ và số.</span>
              </div>
              <div className="field">
                <label htmlFor="dk-mk2">Nhập lại mật khẩu</label>
                <input id="dk-mk2" className="input" type="password" autoComplete="new-password" required value={regForm.confirm} onChange={setR('confirm')} />
              </div>
              <label className="check">
                <input type="checkbox" checked={regForm.agree} onChange={setR('agree')} />
                <span>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của KhangShop.</span>
              </label>
              <button type="submit" className="btn btn-accent btn-lg btn-block" disabled={busy}>
                {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
              </button>
              <p style={{ margin: 0, textAlign: 'center', fontSize: 14 }}>
                Đã có tài khoản?{' '}
                <button type="button" className="link-btn" onClick={() => switchTab('login')}>Đăng nhập</button>
              </p>
            </form>
          )}
          <Link to="/" className="muted" style={{ fontSize: 14, textAlign: 'center' }}>Về trang chủ</Link>
        </section>
      </div>
    </div>
  );
}
