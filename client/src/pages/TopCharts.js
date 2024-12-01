// client/src/pages/TopCharts.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TopCharts.css'; // Import the CSS for styling

function TopCharts() {
  const [topCharts, setTopCharts] = useState([]);
  const [selectedChart, setSelectedChart] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [songs, setSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [loadingDates, setLoadingDates] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [error, setError] = useState('');

  // Fetch all unique top chart names on component mount
  useEffect(() => {
    fetchTopCharts();
  }, []);

  // Function to fetch all top chart names
  const fetchTopCharts = async () => {
    setLoadingCharts(true);
    setError('');
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/top-charts`);
      setTopCharts(res.data);
    } catch (err) {
      console.error('Error fetching top charts:', err);
      setError('Failed to fetch top charts. Please try again later.');
    } finally {
      setLoadingCharts(false);
    }
  };

  // Function to fetch available dates for the selected top chart
  const fetchAvailableDates = async (chartName) => {
    if (!chartName) return;
    setLoadingDates(true);
    setError('');
    try {
      const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/top-charts/${encodeURIComponent(chartName)}/dates`);
      setAvailableDates(res.data);
    } catch (err) {
      console.error(`Error fetching dates for ${chartName}:`, err);
      setError(`Failed to fetch dates for "${chartName}". Please try again later.`);
    } finally {
      setLoadingDates(false);
    }
  };

  // Function to fetch songs for the selected top chart and date
  const fetchSongs = async (chartName, date) => {
    if (!chartName || !date) return;
    setLoadingSongs(true);
    setError('');

    // Ensure date is in 'YYYY-MM-DD' format
    const formattedDate = date.split('T')[0]; // Extract 'YYYY-MM-DD'
    console.log(`Fetching songs for Chart: ${chartName}, Date: ${formattedDate}`);

    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/top-charts/${encodeURIComponent(chartName)}/${encodeURIComponent(formattedDate)}/songs`
      );
      setSongs(res.data);
    } catch (err) {
      console.error(`Error fetching songs for ${chartName} on ${formattedDate}:`, err);
      setError(`Failed to fetch songs for "${chartName}" on "${formattedDate}". Please try again later.`);
    } finally {
      setLoadingSongs(false);
    }
  };

  // Handle change in top chart selection
  const handleChartChange = (e) => {
    const chartName = e.target.value;
    setSelectedChart(chartName);
    setSelectedDate('');
    setSongs([]);
    setSearchQuery('');
    if (chartName) {
      fetchAvailableDates(chartName);
    } else {
      setAvailableDates([]);
    }
  };

  // Handle change in date selection
  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSongs([]);
    setSearchQuery('');
    if (selectedChart && date) {
      fetchSongs(selectedChart, date);
    }
  };

  // Handle search input change
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Filter songs based on search query
  const filteredSongs = songs.filter((song) =>
    song.songTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artistName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="top-charts-container">
      <h2>Top Charts</h2>

      {error && <p className="error-message">{error}</p>}

      {/* Top Charts Dropdown */}
      <div className="form-group">
        <label htmlFor="topChartSelect">Select Top Chart:</label>
        {loadingCharts ? (
          <p>Loading top charts...</p>
        ) : (
          <select
            id="topChartSelect"
            value={selectedChart}
            onChange={handleChartChange}
            className="form-control"
          >
            <option value="">-- Select Top Chart --</option>
            {topCharts.map((chart, index) => (
              <option key={index} value={chart.chartName}>
                {chart.chartName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Dates Dropdown */}
      {selectedChart && (
        <div className="form-group">
          <label htmlFor="dateSelect">Select Date:</label>
          {loadingDates ? (
            <p>Loading dates...</p>
          ) : (
            <select
              id="dateSelect"
              value={selectedDate}
              onChange={handleDateChange}
              className="form-control"
            >
              <option value="">-- Select Date --</option>
              {availableDates.map((dateObj, index) => (
                <option key={index} value={dateObj.chartDate}>
                  {new Date(dateObj.chartDate).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Search Input */}
      {songs.length > 0 && (
        <div className="form-group">
          <label htmlFor="searchInput">Search Songs:</label>
          <input
            type="text"
            id="searchInput"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search by song title or artist"
            className="form-control"
          />
        </div>
      )}

      {/* Songs List */}
      {selectedDate && (
        <div className="songs-list-container">
          <h3>
            Songs in "{selectedChart}" on {new Date(selectedDate).toLocaleDateString()}
          </h3>
          {loadingSongs ? (
            <p>Loading songs...</p>
          ) : songs.length === 0 ? (
            <p>No songs available for this chart and date.</p>
          ) : (
            <>
              <table className="songs-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Song Title</th>
                    <th>Artist</th>
                    <th>Album</th>
                    <th>Duration</th>
                    <th>Plays</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.map((song, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{song.songTitle}</td>
                      <td>{song.artistName}</td>
                      <td>{song.albumTitle}</td>
                      <td>
                        {Math.floor(song.duration / 60)}:
                        {('0' + (song.duration % 60)).slice(-2)}
                      </td>
                      <td>{song.plays.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSongs.length === 0 && <p>No songs match your search criteria.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TopCharts;
