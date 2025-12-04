import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import Landing from './pages/Landing';
import { AppLayout } from './pages/AppLayout';
import Dashboard from './pages/Dashboard';
import Markets from './pages/Markets';
import Docs from './pages/Docs';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        {/* App Routes */}
        <Route path="/app" element={
          <WalletProvider>
            <AppLayout />
          </WalletProvider>
        }>
          <Route index element={<Dashboard />} />
          <Route path="markets" element={<Markets />} />
        </Route>

        {/* Documentation Route */}
        <Route path="/docs" element={<Docs />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
