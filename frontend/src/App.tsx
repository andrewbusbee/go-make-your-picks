// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PickPage from './pages/PickPage';
import ChampionsPage from './pages/ChampionsPage';
import ForgotPassword from './components/admin/ForgotPassword';
import ResetPassword from './components/admin/ResetPassword';
import logger from './utils/logger';

function App() {
  // Log frontend application startup
  logger.info('🚀 Frontend Application Started', {
    environment: import.meta.env.MODE,
    logLevel: logger.getLevel(),
    availableLevels: ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'SILENT'],
    localStorageLogs: logger.getLogs().length
  });

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/champions" element={<ChampionsPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/pick/:token" element={<PickPage />} />
      </Routes>
    </Router>
  );
}

export default App;
