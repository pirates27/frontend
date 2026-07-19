import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import type { RoleType } from '../../models/property.models';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: RoleType[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const isLoggedIn = authService.isLoggedIn();
  const userRole = authService.getUserRole();
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      authService.getProfile()
        .then(() => setProfileLoaded(true))
        .catch((err) => {
          console.error('Failed to load user profile in ProtectedRoute', err);
          setProfileLoaded(true); // Proceed anyway to avoid locking the user out if server is slow or temporary error
        });
    } else {
      setProfileLoaded(true);
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      // If unauthorized, redirect to root which will handle correct dashboard redirect
      return <Navigate to="/" replace />;
    }
  }

  if (!profileLoaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <p className="text-dark-400 text-xs font-semibold uppercase tracking-wider">Syncing Profile...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
