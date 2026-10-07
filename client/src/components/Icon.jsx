const PATHS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  cart: <><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2.5 3.5h2.8l2.4 11.6a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 18l-6-6 6-6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16.5 16.5 0 0 1-2.7 3.3M6.7 6.7C4 8.4 2.5 12 2.5 12S6 18 12 18a8.8 8.8 0 0 0 4.4-1.2" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></>,
  truck: <><path d="M3 6.5h11v9.5H3zM14 10h3.8l3.2 3.2V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  wallet: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6.5 9.5h.01M17.5 14.5h.01" /></>,
  refresh: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4.5v4h4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>,
  box: <><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  tag: <><path d="M3.5 3.5h7.5l9.5 9.5-8 8-9.5-9.5z" /><circle cx="8" cy="8" r="1.5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v6H4V6h6" /></>,
  logout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  alert: <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  printer: <><path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></>,
  bolt: <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" fill="currentColor" stroke="none" />,
  // Biểu tượng danh mục
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.2" /><path d="M11 18h2" /></>,
  shirt: <path d="M8.5 3.5 4 5.8 2.5 10.5l3 1.1V20.5h13v-8.9l3-1.1L20 5.8l-4.5-2.3a3.5 3.5 0 0 1-7 0z" />,
  home: <><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5v10.5h13V9.5" /><path d="M10 20v-5h4v5" /></>,
  drop: <><path d="M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0c0-4.4 6-10.8 6-10.8z" /><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5" /></>,
  smile: <><circle cx="12" cy="12" r="8.5" /><path d="M8.8 14a3.8 3.8 0 0 0 6.4 0" /><path d="M9.2 9.8h.01M14.8 9.8h.01" /></>,
  book: <><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5z" /><path d="M5 18.5A1.5 1.5 0 0 0 6.5 20H19v-3" /></>,
  dumbbell: <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />,
  basket: <><path d="M3 10h18l-1.8 9.2a1 1 0 0 1-1 .8H5.8a1 1 0 0 1-1-.8z" /><path d="m8 10 3-6M16 10l-3-6" /></>,
};

export default function Icon({ name, size = 20, strokeWidth = 2, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

// Biểu tượng và màu nền cho từng danh mục, chọn theo slug
const CATEGORY_STYLE = {
  'dien-tu': ['phone', 'var(--sky)'],
  'thoi-trang': ['shirt', 'var(--pink)'],
  'nha-cua-doi-song': ['home', 'var(--lemon)'],
  'suc-khoe-lam-dep': ['drop', 'var(--violet)'],
  'me-be': ['smile', 'var(--mint)'],
  'sach-van-phong-pham': ['book', 'var(--peach)'],
  'the-thao': ['dumbbell', 'var(--lilac)'],
  'thuc-pham': ['basket', 'var(--lemon)'],
};

export function categoryStyle(slug, index = 0) {
  const fallback = ['tag', ['var(--sky)', 'var(--pink)', 'var(--lemon)', 'var(--mint)'][index % 4]];
  const [icon, color] = CATEGORY_STYLE[slug] ?? fallback;
  return { icon, color };
}
