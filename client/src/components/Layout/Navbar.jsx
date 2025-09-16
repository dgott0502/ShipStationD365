// ... (imports)
function Navbar() {
  // ... (existing logic)
  return (
    <nav className="navbar">
      {/* ... */}
      <div className="nav-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/approvals">Approvals</NavLink>
        <NavLink to="/pallets">Pallets</NavLink>
        <NavLink to="/archive">Archive</NavLink>
        <NavLink to="/admin">Administration</NavLink> {/* NEW */}
      </div>
      {/* ... */}
    </nav>
  );
}
export default Navbar;