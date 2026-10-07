// Thông tin cửa hàng: sửa các giá trị trong ngoặc vuông trước khi demo
export const SHOP = {
  name: 'KhangShop',
  hotline: '[SỐ ĐIỆN THOẠI]',
  email: '[EMAIL]',
  address: '[ĐỊA CHỈ]',
  bank: {
    name: '[TÊN NGÂN HÀNG]',
    account: '[SỐ TÀI KHOẢN]',
    holder: '[TÊN CHỦ TÀI KHOẢN]',
  },
};

export const STATUS = {
  cho_xac_nhan: { label: 'Chờ xác nhận', color: 'var(--lemon)' },
  da_xac_nhan: { label: 'Đã xác nhận', color: 'var(--sky)' },
  dang_giao: { label: 'Đang giao', color: 'var(--lilac)' },
  da_giao: { label: 'Đã giao', color: 'var(--mint)' },
  da_huy: { label: 'Đã hủy', color: 'var(--gray)' },
};

export const STATUS_FLOW = ['cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao'];

export const SHIPPING = {
  standard: { label: 'Giao tiêu chuẩn', sub: 'Nhận hàng trong 3–5 ngày', fee: 30000 },
  express: { label: 'Giao nhanh', sub: 'Nhận hàng trong 1–2 ngày', fee: 50000 },
};

export const PAYMENT = {
  cod: { label: 'Thanh toán khi nhận hàng (COD)', sub: 'Trả tiền mặt cho nhân viên giao hàng' },
  bank: { label: 'Chuyển khoản ngân hàng', sub: 'Chuyển khoản trước, đơn được xác nhận khi cửa hàng nhận tiền' },
};

// 34 tỉnh, thành phố sau sắp xếp đơn vị hành chính năm 2025
export const PROVINCES = [
  'Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế',
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai',
  'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh',
  'Thái Nguyên', 'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long',
];

export const LOW_STOCK = 5;

const TINTS = ['var(--sky)', 'var(--lilac)', 'var(--mint)', 'var(--lemon)', 'var(--pink)', 'var(--peach)', 'var(--violet)'];

export function tintFor(id = 0) {
  return TINTS[id % TINTS.length];
}

export function formatVnd(value) {
  return `${Number(value ?? 0).toLocaleString('vi-VN')}₫`;
}

export function discountPercent(price, oldPrice) {
  return oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
}

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatDateTime(value) {
  if (!value) return '';
  const parts = Object.fromEntries(dateTime.formatToParts(new Date(value)).map((p) => [p.type, p.value]));
  return `${parts.day}/${parts.month}/${parts.year} · ${parts.hour}:${parts.minute}`;
}

export function formatDate(value) {
  return formatDateTime(value).split(' · ')[0];
}
