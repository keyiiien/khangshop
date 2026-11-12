import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

// Giỏ hàng lưu trên máy chủ theo tài khoản (bảng cart_items): phải đăng nhập mới thêm vào giỏ được.
// Giá, tồn kho luôn lấy mới từ máy chủ; giá cuối cùng vẫn do máy chủ tính lại khi đặt hàng.
export function CartProvider({ children }) {
  const { user, ready } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [changed, setChanged] = useState(false);   // máy chủ vừa điều chỉnh giỏ (hết hàng, giảm số lượng…)
  const [loadedFor, setLoadedFor] = useState(null); // giỏ đã tải xong cho tài khoản nào

  const apply = useCallback((cart) => {
    setItems(cart.items);
    if (cart.changed) setChanged(true);
    return cart;
  }, []);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      apply(await api('/cart'));
    } catch {
      // giữ nguyên giỏ đang hiển thị nếu không tải được
    } finally {
      setLoadedFor(user.id);
      setLoading(false);
    }
  }, [user, apply]);

  // Đăng nhập thì tải giỏ của tài khoản, đăng xuất thì giỏ rỗng
  useEffect(() => {
    if (!ready) return;
    if (user) reload();
    else setItems([]);
  }, [ready, user, reload]);

  // Các thao tác trả về Promise; lỗi (hết hàng, chưa đăng nhập…) được ném ra để nơi gọi hiển thị
  const add = useCallback(
    (product, quantity = 1) => api('/cart/items', { method: 'POST', body: { productId: product.id, quantity } }).then(apply),
    [apply],
  );
  const update = useCallback(
    (productId, quantity) => api(`/cart/items/${productId}`, { method: 'PUT', body: { quantity } }).then(apply),
    [apply],
  );
  const remove = useCallback((productId) => api(`/cart/items/${productId}`, { method: 'DELETE' }).then(apply), [apply]);
  const clearChanged = useCallback(() => setChanged(false), []);

  const value = useMemo(() => {
    const count = items.reduce((sum, it) => sum + it.quantity, 0);
    const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    // cartReady: đã biết chắc nội dung giỏ (khách chưa đăng nhập: giỏ rỗng)
    const cartReady = ready && (!user || loadedFor === user.id);
    return {
      items, count, subtotal, loading, changed, cartReady, add, update, remove, reload, clearChanged,
    };
  }, [items, loading, changed, ready, user, loadedFor, add, update, remove, reload, clearChanged]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
