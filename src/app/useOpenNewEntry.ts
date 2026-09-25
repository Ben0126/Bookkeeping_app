import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Opens the new-entry form on the transactions page, keeping its month and
 * filters when already there.
 */
export function useOpenNewEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    const onList = location.pathname === '/transactions';
    const params = new URLSearchParams(onList ? location.search : '');
    params.set('add', '1');
    navigate({ pathname: '/transactions', search: `?${params}` }, { replace: onList });
  };
}
