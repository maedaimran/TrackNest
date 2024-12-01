// client/src/pages/Recommendations.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Recommendations.css';

// Import FontAwesome Icons for the Like button
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart as solidHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as regularHeart } from '@fortawesome/free-regular-svg-icons';

// Import the AddToPlaylistModal component
import AddToPlaylistModal from '../components/AddToPlaylistModal';

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedSong, setExpandedSong] = useState(null); // For expanding song details
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchRecommendations();
    fetchLikedSongs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch recommended songs from the backend
  const fetchRecommendations = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/recommendations`, {
        headers: {
          'x-auth-token': token,
        },
      });
      setRecommendations(res.data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to fetch recommendations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch songs liked by the user
  const fetchLikedSongs = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/likes`, {
        headers: {
          'x-auth-token': token,
        },
      });
      setLikedSongs(res.data);
    } catch (err) {
      console.error('Error fetching liked songs:', err);
      // Optionally, set a message or handle the error
    }
  };

  // Check if a song is liked by the user
  const isSongLiked = (song) => {
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
    <div className="recommendations-container">
      <h2>Recommended for You</h2>

      {message && (
        <p className={messageType === 'success' ? 'success-message' : 'error-message'}>
          {message}
        </p>
      )}

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p>Loading recommendations...</p>
      ) : recommendations.length === 0 ? (
        <p>
          No recommendations available. Try liking more songs to get personalized suggestions.
        </p>
      ) : (
        <div className="results-container">
          <ul className="results-list">
            {recommendations.map((song, index) => {
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
                  </div>
                  {isExpanded && (
                    <div className="song-details">
                      <p>
                        <strong>Album:</strong> {song.albumTitle}
                      </p>
                      <p>
                        <strong>Genre:</strong> {song.genreName || 'N/A'}
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
        </div>
      )}

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={modalOpen}
        onClose={closeModal}
        song={selectedSong}
        token={token}
      />
    </div>
  );
}

export default Recommendations;

