import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // If logged in but wrong role, redirect to their correct dashboard
    if (user) {
      if (user.role === 'client') return <Navigate to="/client/dashboard" replace />;
      if (user.role === 'agent') return <Navigate to="/agent/dashboard" replace />;
      if (user.role === 'agent_technique') return <Navigate to="/technique/dashboard" replace />;
      if (user.role === 'agent_annexe') return <Navigate to="/annexe/dashboard" replace />;
      if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;
