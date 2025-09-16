// ... (imports)
import AdminView from './components/Admin/AdminView'; // New Import

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
            <Route path="/admin" element={<AdminView />} /> {/* New Route */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;