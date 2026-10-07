import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

// Tải dữ liệu từ API mỗi khi path thay đổi. path = null để tạm không tải.
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((error) => active && setState({ data: null, error, loading: false }));
    return () => {
      active = false;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
