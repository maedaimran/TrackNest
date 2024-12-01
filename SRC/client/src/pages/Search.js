// client/src/pages/Search.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import './Search.css'; // Ensure this path is correct

// Import FontAwesome Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';

function Search() {
  const token = localStorage.getItem('token'); // Retrieve JWT token from localStorage
  const [filters, setFilters] = useState({
    songTitle: '',
    artistName: '',
    albumTitle: '',
    genreName: '',
    sortOrder: 'DESC',
    liked: false,
  });

  const [results, setResults] = useState([]); // Search results
  const [likedSongs, setLikedSongs] = useState([]); // Songs liked by the user
  const [message, setMessage] = useState(''); // Success or error messages
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [modalOpen, setModalOpen] = useState(false); // Modal state
  const [selectedSong, setSelectedSong] = useState(null); // Song selected for adding to playlist
  const [loadingLikes, setLoadingLikes] = useState(false); // Loading state for liked songs
  const [expandedSong, setExpandedSong] = useState(null); // Track expanded song

  const { songTitle, artistName, albumTitle, genreName, sortOrder, liked } = filters;

  // Handle input changes for search filters
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters({
      ...filters,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // Handle search form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setResults([]);
    setLikedSongs([]); // Reset liked songs

    try {
      const params = {
        songTitle,
        artistName,
        albumTitle,
        genreName,
        sortOrder,
        liked,
      };

      // Remove empty or false parameters
      Object.keys(params).forEach(
        (key) => (params[key] === '' || params[key] === false) && delete params[key]
      );

      // Make API call to search songs
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/search`, {
        params,
        headers: {
          'x-auth-token': token, // Include token for authenticated requests
        },
      });

      setResults(res.data);

      // If user is logged in, fetch liked songs to determine like status
      if (token) {
        fetchLikedSongs();
      }

      if (res.data.length === 0) {
        setMessage('No results found.');
      }
    } catch (err) {
      console.error('Error during search:', err);
      setMessage('An error occurred during search. Please try again.');
      setMessageType('error');
    }
  };

  // Fetch songs liked by the user
  const fetchLikedSongs = async () => {
    setLoadingLikes(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/likes`, {
        headers: {
          'x-auth-token': token,
        },
      });
      setLikedSongs(res.data); // Assuming res.data is an array of liked songs
    } catch (err) {
      console.error('Error fetching liked songs:', err);
      // Optionally, set a message or handle the error
    } finally {
      setLoadingLikes(false);
    }
  };

  // Check if a song is liked by the user
  const isSongLiked = (song) => {
    // Compare based on unique identifiers: songTitle, artistName, albumTitle
    return likedSongs.some(
      (likedSong) =>
        likedSong.songTitle === song.songTitle &&
        likedSong.artistName === song.artistName &&
        likedSong.albumTitle === song.albumTitle
    );
  };

  // Handle toggling like status of a song
  const handleLikeToggle = async (song) => {
    if (!token) {
      setMessage('You must be logged in to like songs.');
      setMessageType('error');
      return;
    }

    const alreadyLiked = isSongLiked(song);

    try {
      if (alreadyLiked) {
        // Unlike the song
        await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/likes`, {
          headers: {
            'x-auth-token': token,
          },
          data: {
            songTitle: song.songTitle,
            artistName: song.artistName,
            albumTitle: song.albumTitle,
          },
        });

        // Remove the song from likedSongs state
        setLikedSongs((prevLikes) =>
          prevLikes.filter(
            (likedSong) =>
              !(
                likedSong.songTitle === song.songTitle &&
                likedSong.artistName === song.artistName &&
                likedSong.albumTitle === song.albumTitle
              )
          )
        );

        setMessage(`Unliked "${song.songTitle}" successfully.`);
        setMessageType('success');
      } else {
        // Like the song
        await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/api/likes`,
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

        // Add the song to likedSongs state
        setLikedSongs((prevLikes) => [...prevLikes, song]);

        setMessage(`Liked "${song.songTitle}" successfully.`);
        setMessageType('success');
      }
    } catch (err) {
      console.error('Error toggling like status:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setMessage(err.response.data.message);
      } else {
        setMessage('Failed to update like status. Please try again.');
      }
      setMessageType('error');
    }
  };

  // Open the Add to Playlist modal
  const openModal = (song) => {
    setSelectedSong(song);
    setModalOpen(true);
  };

  // Close the Add to Playlist modal
  const closeModal = () => {
    setSelectedSong(null);
    setModalOpen(false);
  };

  // Toggle expanded song
  const handleSongClick = (song) => {
    if (
      expandedSong &&
      expandedSong.songTitle === song.songTitle &&
      expandedSong.artistName === song.artistName &&
      expandedSong.albumTitle === song.albumTitle
    ) {
      setExpandedSong(null);
    } else {
      setExpandedSong(song);
    }
  };

  return (
    <div className="search-container">
      <h2>Search Music</h2>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-group">
          <label htmlFor="songTitle">Song Title:</label>
          <input
            type="text"
            name="songTitle"
            id="songTitle"
            value={songTitle}
            onChange={handleChange}
            placeholder="Enter song title"
          />
        </div>
        <div className="form-group">
          <label htmlFor="artistName">Artist Name:</label>
          <input
            type="text"
            name="artistName"
            id="artistName"
            value={artistName}
            onChange={handleChange}
            placeholder="Enter artist name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="albumTitle">Album Title:</label>
          <input
            type="text"
            name="albumTitle"
            id="albumTitle"
            value={albumTitle}
            onChange={handleChange}
            placeholder="Enter album title"
          />
        </div>
        <div className="form-group">
          <label htmlFor="genreName">Genre:</label>
          <input
            type="text"
            name="genreName"
            id="genreName"
            value={genreName}
            onChange={handleChange}
            placeholder="Enter genre"
          />
        </div>
        <div className="form-group">
          <label htmlFor="sortOrder">Sort by Plays:</label>
          <select name="sortOrder" id="sortOrder" value={sortOrder} onChange={handleChange}>
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </div>
        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            name="liked"
            id="liked"
            checked={liked}
            onChange={handleChange}
          />
          <label htmlFor="liked">Filter Liked Songs</label>
        </div>
        <button type="submit" className="search-button">
          Search
        </button>
      </form>

      {message && <p className={`s-message ${messageType}`}>{message}</p>}

      {results.length > 0 && (
        <div className="results-container">
          <h3>Search Results:</h3>
          <ul className="results-list">
            {results.map((song, index) => {
              const liked = isSongLiked(song);
              const isExpanded =
                expandedSong &&
                expandedSong.songTitle === song.songTitle &&
                expandedSong.artistName === song.artistName &&
                expandedSong.albumTitle === song.albumTitle;
              return (
                <li
                  key={`${song.songTitle}-${index}`}
                  className={`result-item ${isExpanded ? 'expanded' : ''}`}
                >
                  <div className="song-summary" onClick={() => handleSongClick(song)}>
                    <div className="song-info">
                      <span className="artist-name">{song.artistName}</span> -{' '}
                      <span className="song-title">{song.songTitle}</span>
                    </div>
                    {token && (
                      <div className="song-actions">
                        <FontAwesomeIcon
                          icon={liked ? solidHeart : regularHeart}
                          style={{ color: liked ? 'red' : 'grey', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeToggle(song);
                          }}
                        />
                        <button
                          className="add-to-playlist-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(song);
                          }}
                        >
                          Add to Playlist
                        </button>
                      </div>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="song-details">
                      <p>
                        <strong>Album:</strong> {song.albumTitle}
                      </p>
                      <p>
                        <strong>Genre:</strong> {song.genreName}
                      </p>
                      <p>
                        <strong>Duration:</strong>{' '}
                        {song.duration
                          ? `${Math.floor(song.duration / 60)}:${('0' + (song.duration % 60)).slice(-2)}`
                          : 'N/A'}
                      </p>
                      <p>
                        <strong>Plays:</strong>{' '}
                        {song.plays ? song.plays.toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {results.length === 0 && <p>No songs match your search criteria.</p>}
        </div>
      )}

      {/* Add to Playlist Modal */}
      {token && (
        <AddToPlaylistModal
          isOpen={modalOpen}
          onClose={closeModal}
          song={selectedSong}
          token={token}
        />
      )}
    </div>
  );
}

export default Search;
