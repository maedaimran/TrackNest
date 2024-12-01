import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AddToPlaylistModal from '../components/AddToPlaylistModal'; // Import if needed
import './MyPlaylists.css'; // Ensure this path is correct

function MyPlaylists() {
  const token = localStorage.getItem('token');
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // Memoize fetchPlaylists using useCallback
  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/playlists`, {
        headers: {
          'x-auth-token': token,
        },
      });

      setPlaylists(res.data);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setMessage('Failed to fetch playlists.');
      setMessageType('error');
    }
  }, [token]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) {
      setMessage('Playlist name cannot be empty.');
      setMessageType('error');
      return;
    }

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/playlists`,
        {
          name: newPlaylistName.trim(),
        },
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      setMessage(res.data.message);
      setMessageType('success');
      setNewPlaylistName('');
      fetchPlaylists(); // Refresh playlists after creation
    } catch (err) {
      console.error('Error creating playlist:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage('Failed to create playlist.');
      }
      setMessageType('error');
    }
  };

  const handleDeletePlaylist = async (name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the playlist "${name}"?`
    );

    if (!confirmDelete) return;

    try {
      const res = await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/playlists/${encodeURIComponent(name)}`,
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      setMessage(res.data.message);
      setMessageType('success');
      fetchPlaylists(); // Refresh playlists after deletion
    } catch (err) {
      console.error('Error deleting playlist:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage('Failed to delete playlist.');
      }
      setMessageType('error');
    }
  };

  const toggleExpand = (name) => {
    if (expandedPlaylist === name) {
      setExpandedPlaylist(null);
    } else {
      setExpandedPlaylist(name);
    }
  };

  return (
    <div className="my-playlists-container">
      <h2>My Playlists</h2>

      {message && (
        <p className={messageType === 'success' ? 'success-message' : 'error-message'}>
          {message}
        </p>
      )}

      {/* Create New Playlist */}
      <form onSubmit={handleCreatePlaylist} className="create-playlist-form">
        <input
          type="text"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="Enter new playlist name"
          required
        />
        <button type="submit">Create Playlist</button>
      </form>

      {/* Display Playlists */}
      <ul className="playlists-list">
        {playlists.map((playlist) => (
          <li key={playlist.name} className="playlist-item">
            <div className="playlist-header" onClick={() => toggleExpand(playlist.name)}>
              <span>{playlist.name}</span>
              <button
                className="playlist-delete-button"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the expand/collapse
                  handleDeletePlaylist(playlist.name);
                }}
              >
                Delete
              </button>
            </div>

            {expandedPlaylist === playlist.name && (
              <PlaylistSongs name={playlist.name} token={token} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Component to display songs within a playlist
 */
function PlaylistSongs({ name, token }) {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // Memoize fetchSongs using useCallback
  const fetchSongs = useCallback(async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/playlists/${encodeURIComponent(name)}/songs`,
        {
          headers: {
            'x-auth-token': token,
          },
        }
      );

      setSongs(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching songs:', err);
      setError('Failed to fetch songs.');
      setLoading(false);
    }
  }, [name, token]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleDeleteSong = async (song) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to remove "${song.songTitle}" from "${name}"?`
    );

    if (!confirmDelete) return;

    try {
      const res = await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/playlists/${encodeURIComponent(name)}/songs`,
        {
          headers: {
            'x-auth-token': token,
          },
          data: {
            songTitle: song.songTitle,
            artistName: song.artistName,
            albumTitle: song.albumTitle,
          },
        }
      );

      setMessage(res.data.message);
      setMessageType('success');
      fetchSongs(); // Refresh the song list after deletion
    } catch (err) {
      console.error('Error removing song from playlist:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to remove song from playlist.');
      }
    }
  };

  if (loading) {
    return <p>Loading songs...</p>;
  }

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  if (songs.length === 0) {
    return <p>No songs in this playlist.</p>;
  }

  return (
    <div className="songs-list-container">
      {message && (
        <p className={messageType === 'success' ? 'success-message' : 'error-message'}>
          {message}
        </p>
      )}
      <ul className="songs-list">
        {songs.map((song, index) => (
          <li key={index} className="song-item">
            <span>
              {song.songTitle} by {song.artistName} ({song.albumTitle})
            </span>
            <button className="song-delete-button" onClick={() => handleDeleteSong(song)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MyPlaylists;
