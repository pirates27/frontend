import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import type { RoleType } from '../../models/property.models';

interface ProtectedRouteProps {
  allowedRoles?: RoleType[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const isLoggedIn = authService.isLoggedIn();
  const userRole = authService.getUserRole();

  if (!isLoggedIn) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      // If unauthorized, redirect to root which will handle correct dashboard redirect
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};
