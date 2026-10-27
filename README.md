# DailyCart – Website thương mại điện tử và đặt hàng trực tuyến

Đồ án thực tập tốt nghiệp – Nguyễn Công Khang (A44166), Trường Đại học Thăng Long.

Tên cửa hàng hiển thị trên web là **DailyCart**. Tên kho mã nguồn, tên CSDL và tài khoản MySQL vẫn giữ là `khangshop`.

| Thành phần | Công nghệ |
|---|---|
| Giao diện (`client/`) | React 19, React Router 7, Vite 8, CSS thuần (phong cách C: viền đen, bóng khối, màu pastel) |
| Máy chủ API (`server/`) | Node.js 24, Express 5, JWT, bcrypt, Multer (tải ảnh) |
| Cơ sở dữ liệu | MySQL 8.4 (`server/database/schema.sql`) |

## Chức năng

**Khách hàng**
- Trang chủ: danh mục, sản phẩm giảm giá, gợi ý theo bán chạy / mới về / giá tốt
- Tìm kiếm: gợi ý sản phẩm ngay khi gõ, tìm không dấu, không cần đúng thứ tự từ
- Danh sách sản phẩm: tìm kiếm, lọc theo danh mục, khoảng giá, đang giảm giá, còn hàng; sắp xếp; phân trang
- Chi tiết sản phẩm, sản phẩm tương tự
- Đánh giá sản phẩm: điểm trung bình, số đánh giá theo từng mức sao; khách đã nhận hàng được chấm 1–5 sao kèm nhận xét, sửa hoặc xóa đánh giá của mình
- Giỏ hàng (lưu trên trình duyệt, tự đối chiếu giá và tồn kho với máy chủ)
- Đặt hàng không cần đăng nhập; chọn giao tiêu chuẩn/giao nhanh, thanh toán COD/chuyển khoản
- Mã giảm giá ở trang thanh toán (giảm theo % có mức tối đa hoặc giảm số tiền cố định)
- Theo dõi đơn theo mã đơn + số điện thoại; tự hủy đơn khi đơn còn "Chờ xác nhận"
- Đăng ký, đăng nhập, xem "Đơn hàng của tôi"

**Quản trị viên** (`/quan-tri`)
- Tổng quan: giá trị đơn hôm nay, đơn chờ xác nhận, đơn đang giao, sản phẩm sắp hết, biểu đồ 7 ngày
- Đơn hàng: lọc theo trạng thái, tìm kiếm, xem chi tiết, chuyển trạng thái theo đúng luồng, hủy đơn (hoàn kho), in đơn
- Sản phẩm: thêm/sửa/xóa, tải ảnh, ẩn/hiện, theo dõi tồn kho
- Danh mục: thêm/sửa/xóa (không cho xóa danh mục còn sản phẩm)
- Khách hàng: danh sách tài khoản, số đơn, tổng tiền đã mua
- Thống kê doanh thu theo khoảng thời gian: doanh thu, giá trị đơn, trung bình mỗi đơn, đơn hủy; biểu đồ theo ngày/tháng; sản phẩm bán chạy; doanh số theo danh mục
- Mã giảm giá: thêm/sửa/xóa, bật/tắt, đơn tối thiểu, giới hạn lượt dùng, thời hạn
- Đánh giá: xem, tìm, lọc theo số sao và xóa đánh giá không phù hợp

**Quy tắc nghiệp vụ chính (xử lý ở máy chủ)**
- Giá và tổng tiền luôn tính lại ở máy chủ, không tin giá gửi từ trình duyệt
- Đặt hàng chạy trong transaction, khóa dòng sản phẩm (`SELECT … FOR UPDATE`) để không bán quá tồn kho
- Luồng trạng thái: Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao; chỉ được đi tới bước kế tiếp
- Hủy đơn: khách hủy được khi "Chờ xác nhận", quản trị viên hủy được trước khi giao; hủy thì hoàn lại kho
- Mỗi lần đổi trạng thái được ghi vào bảng `order_status_history`
- Mã giảm giá chỉ giảm trên tiền hàng; khi đặt hàng máy chủ khóa dòng mã, kiểm tra lại điều kiện và tăng số lượt dùng trong cùng transaction; hủy đơn thì trả lại lượt dùng
- Chỉ tài khoản có đơn đã giao chứa sản phẩm mới được đánh giá; mỗi tài khoản một đánh giá cho một sản phẩm
- Doanh thu chỉ tính đơn đã giao; giá trị đơn hàng tính mọi đơn không bị hủy

## Cài đặt và chạy trên máy của bạn

### 1. Cài phần mềm cần có (một lần)

| Phần mềm | Phiên bản | Tải ở đâu | Ghi chú |
|---|---|---|---|
| Node.js | 22 LTS hoặc mới hơn (tối thiểu 20.19) | https://nodejs.org | Chọn bản LTS, cài mặc định |
| MySQL Server | 8.0 trở lên (khuyên dùng 8.4 LTS) | https://dev.mysql.com/downloads/mysql/ | **Nhớ mật khẩu root** đặt lúc cài |
| Git (không bắt buộc) | bất kỳ | https://git-scm.com | Không có Git thì tải file ZIP ở bước 2 |

Kiểm tra đã cài xong: mở Terminal (Windows: PowerShell hoặc Command Prompt), gõ `node -v` phải ra `v22…` trở lên.
MySQL phải đang chạy (Windows: mở **Services**, dịch vụ tên `MySQL84` hoặc `MySQL80` ở trạng thái *Running*).

### 2. Tải mã nguồn

Cách 1 – có Git:

```bash
git clone https://github.com/keyiiien/khangshop.git
cd khangshop
```

Cách 2 – không có Git: trên trang GitHub bấm **Code → Download ZIP**, giải nén, mở Terminal trong thư mục
`khangshop-main` vừa giải nén.

### 3. Cài đặt và chạy (gõ lần lượt trong thư mục `khangshop`)

```bash
npm install          # cài thư viện cho cả máy chủ và giao diện (mất 1–2 phút)
npm run setup        # tạo CSDL và dữ liệu mẫu, hỏi mật khẩu root của MySQL
npm run build        # đóng gói giao diện
npm start            # chạy website
```

Mở trình duyệt vào **http://localhost:4000**. Đăng nhập trang quản trị bằng tài khoản ở mục
[Tài khoản dùng thử](#tài-khoản-dùng-thử). Dừng website: bấm `Ctrl + C` trong cửa sổ Terminal.

`npm run setup` làm những việc sau:

- hỏi tài khoản quản trị MySQL (nhấn Enter để dùng `root`) và mật khẩu (gõ không hiện ký tự, không được lưu lại);
- tạo tài khoản MySQL riêng tên `khangshop` với mật khẩu ngẫu nhiên, chỉ có quyền trên CSDL `khangshop`;
- ghi thông tin kết nối vào `server/.env` (tệp này chỉ nằm trên máy bạn, không đưa lên GitHub);
- tạo bảng, chép ảnh sản phẩm mẫu và tạo dữ liệu mẫu.

Những lần sau chỉ cần `npm start` (đã cài và build rồi). Nếu tải bản mã nguồn mới thì chạy lại `npm install` và
`npm run build`; nếu bản mới có thay đổi bảng CSDL thì chạy thêm `npm run db:reset`.

### Lệnh khác

- Tạo lại dữ liệu mẫu từ đầu (xóa hết dữ liệu đang có): `npm run db:reset`. Dữ liệu mẫu gồm 8 danh mục, 96 sản phẩm
  có ảnh, 8 đơn hàng đang xử lý, lịch sử 40 đơn trong 30 ngày của 5 khách hàng mẫu, 50 đánh giá, 4 mã giảm giá:
  `KHANG10`, `GIAM30K`, `CHAOBAN`, `HE2026` (đã hết hạn).
- Khi đang sửa code: `npm run dev:server` và `npm run dev:client` (2 cửa sổ), mở http://localhost:5173.
- Xem dữ liệu bằng MySQL Workbench: các câu truy vấn mẫu ở `server/database/truy_van_mau.sql`.
- Ảnh sản phẩm mẫu nằm ở `server/database/anh-san-pham/`, nguồn và giấy phép từng ảnh ghi trong
  `server/database/NGUON_ANH.md`.

### Gặp lỗi

| Thông báo | Cách xử lý |
|---|---|
| `'node' is not recognized…` / `'npm' is not recognized…` | Chưa cài Node.js, hoặc cần đóng và mở lại Terminal sau khi cài |
| Lỗi khi `npm run build` có nhắc đến phiên bản Node | Node.js quá cũ, cài bản 22 LTS |
| `Không kết nối được MySQL … ECONNREFUSED` | MySQL chưa chạy: bật dịch vụ MySQL trong Services. MySQL dùng cổng khác 3306 thì tạo `server/.env` có dòng `DB_PORT=<cổng>` rồi chạy lại `npm run setup` |
| `Sai mật khẩu, thử lại` | Gõ đúng mật khẩu root đặt lúc cài MySQL; nếu root không có mật khẩu thì nhấn Enter |
| `Chưa có cấu hình server/.env` | Chưa chạy `npm run setup` |
| `Cổng 4000 đang bị chương trình khác dùng` | Website đã chạy ở cửa sổ khác, hoặc đổi `PORT=` trong `server/.env` |
| Trang web không có ảnh sản phẩm | Chạy `npm run db:reset` để chép lại ảnh mẫu |

## Kiểm thử tự động

Thư mục `tests/` gồm 89 kịch bản kiểm thử API và 31 kịch bản kiểm thử giao diện (Chrome không giao diện).
Các kịch bản thay đổi dữ liệu, nên chạy trên CSDL mẫu vừa tạo lại:

```bash
npm run db:reset && npm start                          # cửa sổ 1 (đã npm run build)
cd tests && npm install && npm run api && npm run ui   # cửa sổ 2
```

## Tài khoản dùng thử

Được tạo bởi `npm run db:init` (định nghĩa trong `server/scripts/init-db.js`):

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | admin@dailycart.local | Admin@123 |
| Khách hàng | khach@dailycart.local | Khach@123 |

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
    ├── database/san_pham_mau.json  Danh sách sản phẩm mẫu
    ├── database/anh-san-pham/      Ảnh sản phẩm mẫu (nguồn: NGUON_ANH.md)
    ├── database/truy_van_mau.sql   Truy vấn mẫu để xem dữ liệu
    ├── scripts/init-db.js  Tạo CSDL + dữ liệu mẫu
    └── src/
        ├── routes/         auth, catalog (danh mục, sản phẩm), orders, coupons, reviews,
        │                   admin, adminReports (thống kê), adminPromo (mã giảm giá, đánh giá)
        ├── services/       Nghiệp vụ đơn hàng, sản phẩm, mã giảm giá
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
| GET | `/api/products/:slug/reviews` | Đánh giá của sản phẩm: điểm trung bình, phân bố sao, danh sách |
| POST | `/api/products/:slug/reviews` | Gửi hoặc sửa đánh giá của mình (cần đăng nhập, đã nhận hàng) |
| DELETE | `/api/products/:slug/reviews/mine` | Xóa đánh giá của mình |
| POST | `/api/coupons/check` | Kiểm tra mã giảm giá với giỏ hàng hiện tại |
| POST | `/api/orders` | Đặt hàng (có thể kèm `couponCode`) |
| POST | `/api/orders/lookup` | Tra cứu đơn (mã đơn + số điện thoại) |
| POST | `/api/orders/cancel` | Khách hủy đơn |
| GET | `/api/orders/mine` | Đơn của tài khoản đang đăng nhập |
| GET | `/api/admin/stats` | Số liệu tổng quan |
| GET/PATCH | `/api/admin/orders…` | Danh sách, chi tiết, đổi trạng thái đơn |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/products…` | Quản lý sản phẩm |
| GET/POST/PUT/DELETE | `/api/admin/categories…` | Quản lý danh mục |
| GET | `/api/admin/customers` | Danh sách khách hàng |
| GET | `/api/admin/reports/revenue?from=&to=` | Thống kê doanh thu theo khoảng thời gian (tối đa 366 ngày) |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/coupons…` | Quản lý mã giảm giá |
| GET/DELETE | `/api/admin/reviews…` | Xem và xóa đánh giá |

## Hướng phát triển

Thanh toán trực tuyến (VNPay/MoMo sandbox), gửi email xác nhận đơn, quên mật khẩu qua email, nhiều ảnh cho một sản phẩm, giới hạn số lần tra cứu đơn để chống dò mã.
