import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginClient from './pages/LoginClient';
import LoginStaff from './pages/LoginStaff';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pages de connexion */}
        <Route path="/"       element={<LoginClient />} />
        <Route path="/staff"  element={<LoginStaff />} />

        {/* Dashboards (à faire) */}
        <Route path="/client/dashboard"    element={<div>Dashboard Client — À venir</div>} />
        <Route path="/agent/dashboard"     element={<div>Dashboard Agent — À venir</div>} />
        <Route path="/admin/dashboard"     element={<div>Dashboard Admin — À venir</div>} />
        <Route path="/technique/dashboard" element={<div>Dashboard Agent Technique — À venir</div>} />
        <Route path="/annexe/dashboard"    element={<div>Dashboard Agent Annexe — À venir</div>} />

        {/* Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
