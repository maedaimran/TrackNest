// client/src/components/Header.js

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function Header() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="header">
      <div className="logo">
        <NavLink to="/" className="logo-link">TrackNest</NavLink>
      </div>
      <ul className="nav-links">
        <li>
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : undefined}>
            Search
          </NavLink>
        </li>
        <li>
          <NavLink to="/top-charts" className={({ isActive }) => isActive ? 'active' : undefined}>
            Top Charts
          </NavLink>
        </li>
        <li>
          <NavLink to="/playlists" className={({ isActive }) => isActive ? 'active' : undefined}>
            Playlists
          </NavLink>
        </li>
        {token ? (
          <>
            <li>
              <NavLink to="/recommendations" className={({ isActive }) => isActive ? 'active' : undefined}>
                Recommendations
              </NavLink>
            </li>
            <li>
              <NavLink to="/my-playlists" className={({ isActive }) => isActive ? 'active' : undefined}>
                My Playlists
              </NavLink>
            </li>
            <li>
              <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : undefined}>
                Profile
              </NavLink>
            </li>
            <li>
              <button onClick={handleLogout} className="logout-button">Logout</button>
            </li>
          </>
        ) : (
          <>
            <li>
              <NavLink to="/login" className={({ isActive }) => isActive ? 'active' : undefined}>
                Login
              </NavLink>
            </li>
            <li>
              <NavLink to="/register" className={({ isActive }) => isActive ? 'active' : undefined}>
                Register
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Header;
