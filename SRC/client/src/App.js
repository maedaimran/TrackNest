// client/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import MyPlaylists from './pages/MyPlaylists';
import Playlists from './pages/Playlists';
import TopCharts from './pages/TopCharts'; // Ensure this import exists
import Recommendations from './pages/Recommendations';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Router>
      <Header />
      <div className="container">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<Search />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/top-charts/*" element={<TopCharts />} /> {/* Single Catch-all Route */}
          <Route path="/recommendations" element={<Recommendations />} /> {/* Corrected Line */}

          {/* Protected Routes */}
          <Route
            path="/my-playlists"
            element={
              <ProtectedRoute>
                <MyPlaylists />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          {/* Add other protected routes here as needed */}
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
