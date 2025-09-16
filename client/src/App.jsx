import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

// Import Components
import Navbar from './components/Layout/Navbar';
import Dashboard from './components/Dashboard/Dashboard';
import ApprovalsView from './components/Approvals/ApprovalsView';
import PalletView from './components/Pallets/PalletView';
import ArchiveView from './components/Archive/ArchiveView';
import './assets/styles.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/approvals" element={<ApprovalsView />} />
            <Route path="/pallets" element={<PalletView />} />
            <Route path="/archive" element={<ArchiveView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;