-- Cơ sở dữ liệu KhangShop (MySQL 8.x, utf8mb4)

CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  phone         VARCHAR(15)  NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE products (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  sku         VARCHAR(30)  NOT NULL UNIQUE,
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL UNIQUE,
  description TEXT NULL,
  price       INT UNSIGNED NOT NULL,
  old_price   INT UNSIGNED NULL,
  stock       INT UNSIGNED NOT NULL DEFAULT 0,
  image_url   VARCHAR(255) NULL,
  is_visible  TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id),
  CONSTRAINT chk_products_old_price CHECK (old_price IS NULL OR old_price > price),
  INDEX idx_products_category (category_id)
) ENGINE = InnoDB;

CREATE TABLE orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(20)  NOT NULL UNIQUE,
  user_id         INT UNSIGNED NULL,
  customer_name   VARCHAR(100) NOT NULL,
  phone           VARCHAR(15)  NOT NULL,
  email           VARCHAR(150) NULL,
  province        VARCHAR(100) NOT NULL,
  ward            VARCHAR(100) NOT NULL,
  address_detail  VARCHAR(255) NOT NULL,
  note            VARCHAR(500) NULL,
  shipping_method ENUM('standard', 'express') NOT NULL,
  shipping_fee    INT UNSIGNED NOT NULL,
  payment_method  ENUM('cod', 'bank') NOT NULL,
  subtotal        INT UNSIGNED NOT NULL,
  total           INT UNSIGNED NOT NULL,
  status          ENUM('cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy') NOT NULL DEFAULT 'cho_xac_nhan',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at),
  INDEX idx_orders_phone (phone)
) ENGINE = InnoDB;

-- Lưu tên và giá tại thời điểm đặt để đơn cũ không đổi khi sản phẩm thay đổi
CREATE TABLE order_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id     INT UNSIGNED NOT NULL,
  product_id   INT UNSIGNED NULL,
  product_name VARCHAR(200) NOT NULL,
  unit_price   INT UNSIGNED NOT NULL,
  quantity     INT UNSIGNED NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE order_status_history (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id   INT UNSIGNED NOT NULL,
  status     ENUM('cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'da_giao', 'da_huy') NOT NULL,
  changed_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE = InnoDB;
