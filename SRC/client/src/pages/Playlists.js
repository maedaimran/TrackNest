// client/src/pages/Playlists.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Playlists.css'; // Ensure this CSS file exists

function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [expandedPlaylist, setExpandedPlaylist] = useState(null);
  const [songs, setSongs] = useState({});
  const [bios, setBios] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useEffect(() => {
    fetchAllPlaylists();
  }, []);

  const fetchAllPlaylists = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/playlists/all`
      );
      setPlaylists(res.data);
    } catch (err) {
      console.error('Error fetching all playlists:', err);
      setMessage('Failed to fetch playlists.');
      setMessageType('error');
    }
  };

  const toggleExpand = async (playlist) => {
    if (
      expandedPlaylist &&
      expandedPlaylist.name === playlist.name &&
      expandedPlaylist.username === playlist.username
    ) {
      // Collapse if already expanded
      setExpandedPlaylist(null);
      return;
    }

    setExpandedPlaylist(playlist);

    // Fetch songs for the selected playlist if not already fetched
    if (!songs[playlist.name + playlist.username]) {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/playlists/${encodeURIComponent(
            playlist.username
          )}/${encodeURIComponent(playlist.name)}/songs`
        );
        setSongs((prevSongs) => ({
          ...prevSongs,
          [playlist.name + playlist.username]: res.data,
        }));
      } catch (err) {
        console.error('Error fetching songs for playlist:', err);
        setMessage(`Failed to fetch songs for playlist "${playlist.name}".`);
        setMessageType('error');
      }
    }

    // Fetch bio for the playlist creator if not already fetched
    if (!bios[playlist.username]) {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/users/${encodeURIComponent(
            playlist.username
          )}/profile`
        );
        setBios((prevBios) => ({
          ...prevBios,
          [playlist.username]: res.data.bio,
        }));
      } catch (err) {
        console.error('Error fetching user bio:', err);
        setMessage(`Failed to fetch bio for user "${playlist.username}".`);
        setMessageType('error');
      }
    }
  };

  return (
    <div className="playlists-container">
      <h2>All Playlists</h2>

      {message && (
        <p
          className={
            messageType === 'success' ? 'success-message' : 'error-message'
          }
        >
          {message}
        </p>
      )}

      {playlists.length === 0 ? (
        <p>No playlists available.</p>
      ) : (
        <ul className="playlists-list">
          {playlists.map((playlist) => (
            <li
              key={playlist.name + playlist.username}
              className="playlist-item"
            >
              <div
                className="playlist-header"
                onClick={() => toggleExpand(playlist)}
              >
                <span className="playlist-name">{playlist.name}</span>
                <span className="playlist-creator">by {playlist.username}</span>
              </div>
              {expandedPlaylist &&
                expandedPlaylist.name === playlist.name &&
                expandedPlaylist.username === playlist.username && (
                  <div className="songs-list-container">
                    {bios[playlist.username] !== undefined && (
                      <p className="user-bio">
                        <strong>{playlist.username}'s Bio:</strong>{' '}
                        {bios[playlist.username] || 'No bio available.'}
                      </p>
                    )}
                    {songs[playlist.name + playlist.username] ? (
                      songs[playlist.name + playlist.username].length === 0 ? (
                        <p>No songs in this playlist.</p>
                      ) : (
                        <ul className="songs-list">
                          {songs[playlist.name + playlist.username].map(
                            (song, index) => (
                              <li key={index} className="song-item">
                                <span>
                                  {song.songTitle} by {song.artistName} (
                                  {song.albumTitle})
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      )
                    ) : (
                      <p>Loading songs...</p>
                    )}
                  </div>
                )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Playlists;
