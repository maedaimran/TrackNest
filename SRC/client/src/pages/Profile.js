// client/src/pages/Profile.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [userData, setUserData] = useState({
    username: '',
    email: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    // Fetch user data on component mount
    const fetchUserData = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/profile`, {
          headers: {
            'x-auth-token': token,
          },
        });

        setUserData({
          username: res.data.username,
          email: res.data.email,
          bio: res.data.bio,
        });
      } catch (err) {
        console.error('Error fetching user data:', err);
        setMessage('Error fetching user data.');
        setMessageType('error');
      }
    };

    if (token) {
      fetchUserData();
    }
  }, [token]);

  const handleBioChange = (e) => {
    setUserData({ ...userData, bio: e.target.value });
  };

  const handleBioSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      const res = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/profile/bio`, {
        bio: userData.bio,
      }, {
        headers: {
          'x-auth-token': token,
        },
      });

      setMessage(res.data.message);
      setMessageType('success');
    } catch (err) {
      console.error('Error updating bio:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage('Failed to update bio.');
      }
      setMessageType('error');
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    const { currentPassword, newPassword, confirmNewPassword } = passwordData;

    if (newPassword !== confirmNewPassword) {
      setMessage('New passwords do not match.');
      setMessageType('error');
      return;
    }

    try {
      const res = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/profile/password`, {
        currentPassword,
        newPassword,
        confirmNewPassword, // Include this field
      }, {
        headers: {
          'x-auth-token': token,
        },
      });

      setMessage(res.data.message);
      setMessageType('success');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });

      // Logout after 3 seconds
      setTimeout(() => {
        localStorage.removeItem('token');
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Error updating password:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage('Failed to update password.');
      }
      setMessageType('error');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');

    if (!confirmDelete) return;

    try {
      const res = await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/profile`, {
        headers: {
          'x-auth-token': token,
        },
      });

      setMessage(res.data.message);
      setMessageType('success');

      // Logout after 3 seconds
      setTimeout(() => {
        localStorage.removeItem('token');
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Error deleting account:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage('Failed to delete account.');
      }
      setMessageType('error');
    }
  };

  return (
    <div className="profile-container">
      <h2>Profile</h2>
      {message && (
        <p className={messageType === 'success' ? 'success-message' : 'error-message'}>
          {message}
        </p>
      )}

      {/* Update Bio */}
      <div className="profile-section">
        <h3>Update Bio</h3>
        <form onSubmit={handleBioSubmit} className="profile-form">
          <div className="form-group">
            <label>Bio:</label>
            <textarea
              name="bio"
              value={userData.bio}
              onChange={handleBioChange}
              placeholder="Update your bio"
            />
          </div>
          <button type="submit" className="profile-button">Update Bio</button>
        </form>
      </div>

      {/* Update Password */}
      <div className="profile-section">
        <h3>Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="profile-form">
          <div className="form-group">
            <label>Current Password:</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              required
              placeholder="Enter your current password"
            />
          </div>
          <div className="form-group">
            <label>New Password:</label>
            <input
              type="password"
              name="newPassword"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              required
              placeholder="Enter your new password"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password:</label>
            <input
              type="password"
              name="confirmNewPassword"
              value={passwordData.confirmNewPassword}
              onChange={handlePasswordChange}
              required
              placeholder="Confirm your new password"
            />
          </div>
          <button type="submit" className="profile-button">Change Password</button>
        </form>
      </div>

      {/* Delete Account */}
      <div className="profile-section">
        <h3>Delete Account</h3>
        <button onClick={handleDeleteAccount} className="delete-button">Delete My Account</button>
      </div>
    </div>
  );
}

export default Profile;
