// client/src/pages/Register.js

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    bio: '',
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const { username, email, password, bio } = formData;

  const onChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    try {
      const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/register`, {
        username,
        email,
        password,
        bio,
      });

      setMessage(res.data.message);
      setMessageType('success');
      setFormData({
        username: '',
        email: '',
        password: '',
        bio: '',
      });

      // Redirect to Login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage('Registration failed. Please try again.');
      }
      setMessageType('error');
    }
  };

  return (
    <div className="auth-container">
      <h2>Register</h2>
      {message && (
        <p className={messageType === 'success' ? 'success-message' : 'error-message'}>
          {message}
        </p>
      )}
      <form onSubmit={onSubmit} className="auth-form">
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            name="username"
            value={username}
            onChange={onChange}
            required
            placeholder="Enter your username"
          />
        </div>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={onChange}
            required
            placeholder="Enter your email"
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            name="password"
            value={password}
            onChange={onChange}
            required
            placeholder="Enter your password"
          />
        </div>
        <div className="form-group">
          <label>Bio:</label>
          <textarea
            name="bio"
            value={bio}
            onChange={onChange}
            placeholder="Tell us about yourself (optional)"
          />
        </div>
        <button type="submit" className="auth-button">Register</button>
      </form>
    </div>
  );
}

export default Register;
