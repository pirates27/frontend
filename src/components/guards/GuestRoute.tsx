import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth.service';

export const GuestRoute = () => {
  const isLoggedIn = authService.isLoggedIn();

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
