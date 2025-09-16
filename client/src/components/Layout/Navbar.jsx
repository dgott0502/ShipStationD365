import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { getAutoLabelStatus, toggleAutoLabel } from '../../services/apiService';

function Navbar() {
  const [isAutoLabelOn, setIsAutoLabelOn] = useState(true);

  useEffect(() => {
    getAutoLabelStatus().then(response => {
      setIsAutoLabelOn(response.data.isEnabled);
    }).catch(err => console.error("Could not fetch toggle status"));
  }, []);

  const handleToggle = async () => {
    const newState = !isAutoLabelOn;
    setIsAutoLabelOn(newState);
    try {
      await toggleAutoLabel(newState);
    } catch (error) {
      console.error("Failed to update setting:", error);
      setIsAutoLabelOn(!newState); // Revert on failure
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>ShipStation &lt;&gt; D365</h1>
      </div>

      <div className="nav-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/approvals">Approvals</NavLink>
        <NavLink to="/pallets">Pallets</NavLink>
        <NavLink to="/archive">Archive</NavLink>
      </div>

      <div className="settings-toggle">
        <span>Auto-Process Orders</span>
        <label className="switch">
          <input type="checkbox" checked={isAutoLabelOn} onChange={handleToggle} />
          <span className="slider round"></span>
        </label>
      </div>
    </nav>
  );
}

export default Navbar;