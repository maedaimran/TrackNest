// client/src/components/AddToPlaylistModal.js

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AddToPlaylistModal.css'; // Ensure this path is correct

function AddToPlaylistModal({ isOpen, onClose, song, token }) {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      console.log('Modal opened');
      fetchPlaylists();
      // Focus the modal for accessibility
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }
    // eslint-disable-next-line
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const fetchPlaylists = async () => {
    try {
      console.log('Fetching playlists...');
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/playlists`, {
        headers: {
          'x-auth-token': token,
        },
      });
      console.log('Playlists fetched:', res.data);
      setPlaylists(res.data);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      if (err.response) {
        // Server responded with a status other than 2xx
        setMessage(err.response.data.message || 'Failed to fetch playlists.');
      } else if (err.request) {
        // Request was made but no response received
        setMessage('No response from server. Please check your connection.');
      } else {
        // Something else caused the error
        setMessage('An unexpected error occurred.');
      }
      setMessageType('error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPlaylist) {
      setMessage('Please select a playlist.');
      setMessageType('error');
      return;
    }

    try {
      console.log(`Adding song to playlist: ${selectedPlaylist}`);
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/playlists/${encodeURIComponent(selectedPlaylist)}/songs`,
        {
          songTitle: song.songTitle,
          artistName: song.artistName,
          albumTitle: song.albumTitle,
        },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      console.log('Add to playlist response:', res.data);
      setMessage(res.data.message);
      setMessageType('success');

      // Optionally, refresh playlists or search results here

      // Close the modal after a short delay
      setTimeout(() => {
        onClose();
        setMessage('');
        setMessageType('');
        setSelectedPlaylist('');
      }, 2000);
    } catch (err) {
      console.error('Error adding song to playlist:', err);
      if (err.response) {
        setMessage(err.response.data.message || 'Failed to add song to playlist.');
      } else if (err.request) {
        setMessage('No response from server. Please check your connection.');
      } else {
        setMessage('An unexpected error occurred.');
      }
      setMessageType('error');
    }
  };

  if (!isOpen || !song) {
    console.log('Modal not open or song undefined');
    return null; // Prevent rendering if modal is not open or song is undefined
  }

  return (
    <div className="add-to-playlist-modal-overlay" onClick={onClose}>
      <div
        className="add-to-playlist-modal"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
        ref={modalRef}
        tabIndex="-1"
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-heading"
      >
        <h3 id="modal-heading">Add "{song.songTitle}" to Playlist</h3>

        {message && (
          <p className={messageType === 'success' ? 'success-message' : 'error-message'}>
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="add-to-playlist-form">
          <label htmlFor="playlist-select">Select Playlist:</label>
          <select
            id="playlist-select"
            value={selectedPlaylist}
            onChange={(e) => setSelectedPlaylist(e.target.value)}
            required
          >
            <option value="">--Choose a Playlist--</option>
            {playlists.map((playlist) => (
              <option key={playlist.name} value={playlist.name}>
                {playlist.name}
              </option>
            ))}
          </select>

          <div className="modal-buttons">
            <button type="submit" className="confirm-button">
              Add
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddToPlaylistModal;
