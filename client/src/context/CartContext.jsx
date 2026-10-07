import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const CART_KEY = 'khangshop.cart';
const MAX_QTY = 99;
const CartContext = createContext(null);

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

// Giỏ hàng lưu ở trình duyệt; giá cuối cùng luôn do server tính lại khi đặt hàng
export function CartProvider({ children }) {
  const [items, setItems] = useState(loadCart);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items));
    } catch {
      // bỏ qua nếu trình duyệt không cho lưu
    }
  }, [items]);

  const limitFor = (stock) => Math.max(0, Math.min(MAX_QTY, stock ?? MAX_QTY));

  const add = useCallback((product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((it) => it.productId === product.id);
      const max = limitFor(product.stock);
      if (existing) {
        return current.map((it) =>
          it.productId === product.id ? { ...it, quantity: Math.min(max, it.quantity + quantity), stock: product.stock } : it,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category?.name,
          stock: product.stock,
          quantity: Math.min(max, quantity),
        },
      ];
    });
  }, []);

  const update = useCallback((productId, quantity) => {
    setItems((current) =>
      current.map((it) => (it.productId === productId ? { ...it, quantity: Math.max(1, Math.min(limitFor(it.stock), quantity)) } : it)),
    );
  }, []);

  const remove = useCallback((productId) => {
    setItems((current) => current.filter((it) => it.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // Cập nhật giá, tên, tồn kho mới nhất từ server; bỏ sản phẩm đã ngừng bán.
  // Trả về true nếu giỏ hàng bị thay đổi để báo cho khách biết.
  const sync = useCallback((freshProducts) => {
    const byId = new Map(freshProducts.map((p) => [p.id, p]));
    let changed = false;
    const next = itemsRef.current.flatMap((it) => {
      const p = byId.get(it.productId);
      if (!p || p.stock === 0) {
        changed = true;
        return [];
      }
      const quantity = Math.min(it.quantity, limitFor(p.stock));
      if (p.price !== it.price || quantity !== it.quantity) changed = true;
      return [{ ...it, name: p.name, slug: p.slug, price: p.price, imageUrl: p.imageUrl, stock: p.stock, quantity }];
    });
    setItems(next);
    return changed;
  }, []);

  const value = useMemo(() => {
    const count = items.reduce((sum, it) => sum + it.quantity, 0);
    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    return { items, count, subtotal, add, update, remove, clear, sync };
  }, [items, add, update, remove, clear, sync]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
