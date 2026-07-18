import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RootRedirect } from './components/guards/RootRedirect';
import { GuestRoute } from './components/guards/GuestRoute';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

import { BuyerDashboard } from './pages/dashboards/BuyerDashboard';
import { ProviderDashboard } from './pages/dashboards/ProviderDashboard';
import { GovtDashboard } from './pages/dashboards/GovtDashboard';
import { AdminDashboard } from './pages/dashboards/AdminDashboard';
import { PropertyDetail } from './pages/property-detail/PropertyDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        
        {/* Guest Routes */}
        <Route element={<GuestRoute />}>
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
        </Route>

        {/* Protected Routes by Role */}
        <Route element={<ProtectedRoute allowedRoles={['BUYER']} />}>
          <Route path="/buyer" element={<BuyerDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['PROVIDER']} />}>
          <Route path="/provider" element={<ProviderDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['GOVERNMENT_OFFICER', 'ADMIN']} />}>
          <Route path="/officer" element={<GovtDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GOVERNMENT_OFFICER']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        {/* Generic Protected Route */}
        <Route element={<ProtectedRoute />}>
          <Route path="/properties/:id" element={<PropertyDetail />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
