# KhangShop – Website thương mại điện tử và đặt hàng trực tuyến

Đồ án thực tập tốt nghiệp – Nguyễn Công Khang (A44166), Trường Đại học Thăng Long.

| Thành phần | Công nghệ |
|---|---|
| Giao diện (`client/`) | React 19, React Router 7, Vite 8, CSS thuần (phong cách C: viền đen, bóng khối, màu pastel) |
| Máy chủ API (`server/`) | Node.js 24, Express 5, JWT, bcrypt, Multer (tải ảnh) |
| Cơ sở dữ liệu | MySQL 8.4 (`server/database/schema.sql`) |

## Chức năng

**Khách hàng**
- Trang chủ: danh mục, sản phẩm giảm giá, gợi ý theo bán chạy / mới về / giá tốt
- Danh sách sản phẩm: tìm kiếm, lọc theo danh mục, khoảng giá, đang giảm giá, còn hàng; sắp xếp; phân trang
- Chi tiết sản phẩm, sản phẩm tương tự
- Giỏ hàng (lưu trên trình duyệt, tự đối chiếu giá và tồn kho với máy chủ)
- Đặt hàng không cần đăng nhập; chọn giao tiêu chuẩn/giao nhanh, thanh toán COD/chuyển khoản
- Theo dõi đơn theo mã đơn + số điện thoại; tự hủy đơn khi đơn còn "Chờ xác nhận"
- Đăng ký, đăng nhập, xem "Đơn hàng của tôi"

**Quản trị viên** (`/quan-tri`)
- Tổng quan: giá trị đơn hôm nay, đơn chờ xác nhận, đơn đang giao, sản phẩm sắp hết, biểu đồ 7 ngày
- Đơn hàng: lọc theo trạng thái, tìm kiếm, xem chi tiết, chuyển trạng thái theo đúng luồng, hủy đơn (hoàn kho), in đơn
- Sản phẩm: thêm/sửa/xóa, tải ảnh, ẩn/hiện, theo dõi tồn kho
- Danh mục: thêm/sửa/xóa (không cho xóa danh mục còn sản phẩm)
- Khách hàng: danh sách tài khoản, số đơn, tổng tiền đã mua

**Quy tắc nghiệp vụ chính (xử lý ở máy chủ)**
- Giá và tổng tiền luôn tính lại ở máy chủ, không tin giá gửi từ trình duyệt
- Đặt hàng chạy trong transaction, khóa dòng sản phẩm (`SELECT … FOR UPDATE`) để không bán quá tồn kho
- Luồng trạng thái: Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao; chỉ được đi tới bước kế tiếp
- Hủy đơn: khách hủy được khi "Chờ xác nhận", quản trị viên hủy được trước khi giao; hủy thì hoàn lại kho
- Mỗi lần đổi trạng thái được ghi vào bảng `order_status_history`

## Cài đặt và chạy

Yêu cầu: Node.js 20 trở lên, MySQL 8.

Các lệnh dưới đây chạy ở thư mục gốc `khangshop/`.

```bash
# 1. Cài thư viện (một lần)
npm install --prefix server
npm install --prefix client

# 2. Tạo CSDL (một lần): hỏi mật khẩu root của MySQL (gõ ẩn, không lưu lại),
#    tạo tài khoản MySQL riêng "khangshop" chỉ có quyền trên CSDL khangshop,
#    ghi server/.env rồi tạo bảng và dữ liệu mẫu
npm run setup

# 3. Build giao diện và chạy
npm run build
npm start                            # mở http://localhost:4000
```

- Tạo lại dữ liệu mẫu từ đầu: `npm run db:reset`.
- Khi đang sửa code: `npm run dev:server` và `npm run dev:client` (2 cửa sổ), mở http://localhost:5173.

## Kiểm thử tự động

Thư mục `tests/` gồm 51 kịch bản kiểm thử API và 20 kịch bản kiểm thử giao diện (Chrome không giao diện).
Các kịch bản thay đổi dữ liệu, nên chạy trên CSDL mẫu vừa tạo lại:

```bash
npm run db:reset && npm start                          # cửa sổ 1 (đã npm run build)
cd tests && npm install && npm run api && npm run ui   # cửa sổ 2
```

## Tài khoản dùng thử

Được tạo bởi `npm run db:init` (định nghĩa trong `server/scripts/init-db.js`):

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | admin@khangshop.local | Admin@123 |
| Khách hàng | khach@khangshop.local | Khach@123 |

Đổi mật khẩu này nếu đưa website lên mạng.

## Cần điền trước khi demo

Thông tin cửa hàng nằm trong `client/src/format.js` (hằng `SHOP`): hotline, email, địa chỉ, tài khoản ngân hàng nhận chuyển khoản. Các giá trị trong ngoặc vuông `[…]` là chỗ cần thay.

## Cấu trúc thư mục

```
khangshop/
├── client/                 Giao diện React
│   └── src/
│       ├── pages/          Các trang khách hàng
│       ├── pages/admin/    Các trang quản trị
│       ├── components/     Header, footer, thẻ sản phẩm, icon…
│       ├── context/        Đăng nhập (AuthContext), giỏ hàng (CartContext)
│       ├── api.js          Hàm gọi API
│       ├── format.js       Định dạng tiền, ngày, trạng thái; thông tin cửa hàng
│       └── styles.css      Toàn bộ giao diện
└── server/                 API Express
    ├── database/schema.sql Thiết kế bảng
    ├── scripts/init-db.js  Tạo CSDL + dữ liệu mẫu
    └── src/
        ├── routes/         auth, catalog (danh mục, sản phẩm), orders, admin
        ├── services/       Nghiệp vụ đơn hàng, sản phẩm
        ├── middleware/     Xác thực JWT, phân quyền
        └── upload.js       Tải ảnh sản phẩm
```

## Danh sách API

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập bằng email hoặc số điện thoại |
| GET | `/api/auth/me` | Thông tin tài khoản đang đăng nhập |
| GET | `/api/categories` | Danh mục |
| GET | `/api/products` | Danh sách sản phẩm (`q, category, minPrice, maxPrice, sale, inStock, sort, page, limit`) |
| GET | `/api/products/batch?ids=` | Giá, tồn kho mới nhất cho giỏ hàng |
| GET | `/api/products/:slug` | Chi tiết sản phẩm + sản phẩm tương tự |
| POST | `/api/orders` | Đặt hàng |
| POST | `/api/orders/lookup` | Tra cứu đơn (mã đơn + số điện thoại) |
| POST | `/api/orders/cancel` | Khách hủy đơn |
| GET | `/api/orders/mine` | Đơn của tài khoản đang đăng nhập |
| GET | `/api/admin/stats` | Số liệu tổng quan |
| GET/PATCH | `/api/admin/orders…` | Danh sách, chi tiết, đổi trạng thái đơn |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/products…` | Quản lý sản phẩm |
| GET/POST/PUT/DELETE | `/api/admin/categories…` | Quản lý danh mục |
| GET | `/api/admin/customers` | Danh sách khách hàng |

## Hướng phát triển

Đánh giá sản phẩm, mã giảm giá, thanh toán trực tuyến (VNPay/MoMo sandbox), quên mật khẩu qua email, nhiều ảnh cho một sản phẩm, giới hạn số lần tra cứu đơn để chống dò mã.
