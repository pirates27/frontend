import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';

export const RootRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const isLoggedIn = authService.isLoggedIn();
    if (!isLoggedIn) {
      navigate('/auth/login', { replace: true });
      return;
    }

    const role = authService.getUserRole();
    switch (role) {
      case 'ADMIN':
        navigate('/admin', { replace: true });
        break;
      case 'GOVERNMENT_OFFICER':
        navigate('/officer', { replace: true });
        break;
      case 'PROVIDER':
        navigate('/provider', { replace: true });
        break;
      case 'BUYER':
      default:
        navigate('/buyer', { replace: true });
        break;
    }
  }, [navigate]);

  return null; // Or a loading spinner
};
