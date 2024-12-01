// server/routes/api.js

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware to authenticate and authorize users
const auth = require('../middleware/auth');

/**
 * Middleware to allow optional authentication
 * If token is provided, authenticate the user
 * Otherwise, proceed without authentication
 */
function authOptional(req, res, next) {
  const token = req.header('x-auth-token');

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Invalid token:', err.message);
    // Proceed without attaching user
    next();
  }
}

/**
 * @route   POST /api/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  const { username, email, password, bio } = req.body;

  // Basic input validation
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Please provide username, email, and password.' });
  }

  try {
    const db = req.db;

    // Check if the username already exists
    const [existingUsername] = await db.promise().query(
      `
      SELECT username
      FROM User
      WHERE username = ?
      `,
      [username]
    );

    if (existingUsername.length > 0) {
      return res.status(400).json({
        message: 'Username already taken. Please choose another one.',
      });
    }

    // Check if the email already exists
    const [existingEmail] = await db.promise().query(
      `
      SELECT email
      FROM User
      WHERE email = ?
      `,
      [email]
    );

    if (existingEmail.length > 0) {
      return res.status(400).json({
        message: 'Email already registered. Please use a different email.',
      });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user into the database
    await db.promise().query(
      `
      INSERT INTO User (username, email, password, bio)
      VALUES (?, ?, ?, ?)
      `,
      [username, email, hashedPassword, bio || null]
    );

    res
      .status(201)
      .json({ message: 'User registered successfully. You can now log in.' });
  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({
      message: 'Server error during registration. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic input validation
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: 'Please provide email and password.' });
  }

  try {
    const db = req.db;

    // Retrieve the user by email
    const [users] = await db.promise().query(
      `
      SELECT *
      FROM User
      WHERE email = ?
      `,
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    // Prepare the payload for JWT
    const payload = {
      user: {
        id: user.username, // Using username as the unique identifier
        email: user.email,
      },
    };

    // Sign the JWT token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '3h',
    });

    // Respond with the token and user information (excluding password)
    res.json({
      token,
      user: {
        username: user.username,
        email: user.email,
        bio: user.bio,
      },
      message: 'Login successful.',
    });
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({
      message: 'Server error during login. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/search
 * @desc    Search for songs with multiple filters and sorting options
 * @access  Public or Protected (if filtering liked songs)
 */
router.get('/search', authOptional, async (req, res) => {
  const {
    songTitle,
    artistName,
    albumTitle,
    genreName,
    sortOrder,
    liked,
  } = req.query;

  // Initialize base query
  let baseQuery = `
    SELECT
      Song.songTitle,
      Artist.artistName,
      Album.albumTitle,
      Genre.genreName,
      Song.plays,
      Song.duration
    FROM Song
    JOIN Artist ON Song.artistName = Artist.artistName
    JOIN Album ON Song.albumTitle = Album.albumTitle
              AND Song.artistName = Album.artistName
    JOIN Classification ON Song.songTitle = Classification.songTitle
                        AND Song.artistName = Classification.artistName
                        AND Song.albumTitle = Classification.albumTitle
    JOIN Genre ON Classification.genreName = Genre.genreName
    WHERE 1=1
  `;

  // Initialize parameters array for parameterized query
  let params = [];

  // Apply filters if provided
  if (songTitle) {
    baseQuery += ` AND Song.songTitle LIKE ?`;
    params.push(`%${songTitle}%`);
  }

  if (artistName) {
    baseQuery += ` AND Artist.artistName LIKE ?`;
    params.push(`%${artistName}%`);
  }

  if (albumTitle) {
    baseQuery += ` AND Album.albumTitle LIKE ?`;
    params.push(`%${albumTitle}%`);
  }

  if (genreName) {
    baseQuery += ` AND Genre.genreName LIKE ?`;
    params.push(`%${genreName}%`);
  }

  // If 'liked' is true and user is authenticated, filter liked songs
  if (liked === 'true') {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Authentication required to filter liked songs.',
      });
    }

    baseQuery += `
      AND Song.songTitle IN (
        SELECT songTitle
        FROM UserLike
        WHERE username = ?
      )
    `;
    params.push(req.user.id);
  }

  // Apply sorting
  let order = 'DESC'; // Default sorting order
  if (sortOrder && sortOrder.toUpperCase() === 'ASC') {
    order = 'ASC';
  }

  baseQuery += ` ORDER BY Song.plays ${order}`;

  try {
    const [results] = await req.db.promise().query(baseQuery, params);
    res.json(results);
  } catch (error) {
    console.error('Error during search:', error);
    res.status(500).json({ message: 'Server error during search.' });
  }
});

/**
 * @route   GET /api/profile
 * @desc    Get the authenticated user's profile
 * @access  Protected
 */
router.get('/profile', auth, async (req, res) => {
  try {
    const db = req.db;
    const username = req.user.id; // Assuming 'id' is the username

    // Retrieve user data excluding the password
    const [users] = await db.promise().query(
      `
      SELECT username, email, bio
      FROM User
      WHERE username = ?
      `,
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      message: 'Server error while fetching profile. Please try again later.',
    });
  }
});

/**
 * @route   PUT /api/profile/bio
 * @desc    Update the authenticated user's bio
 * @access  Protected
 */
router.put('/profile/bio', auth, async (req, res) => {
  const { bio } = req.body;

  // Optional: Validate bio length or content here

  try {
    const db = req.db;
    const username = req.user.id;

    // Update the bio in the database
    await db.promise().query(
      `
      UPDATE User
      SET bio = ?
      WHERE username = ?
      `,
      [bio, username]
    );

    res.json({ message: 'Bio updated successfully.' });
  } catch (error) {
    console.error('Error updating bio:', error);
    res.status(500).json({
      message: 'Server error while updating bio. Please try again later.',
    });
  }
});

/**
 * @route   PUT /api/profile/password
 * @desc    Change the authenticated user's password
 * @access  Protected
 */
router.put('/profile/password', auth, async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  // Input validation
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res
      .status(400)
      .json({ message: 'Please provide all required fields.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res
      .status(400)
      .json({ message: 'New passwords do not match.' });
  }

  try {
    const db = req.db;
    const username = req.user.id;

    // Retrieve the user's current hashed password
    const [users] = await db.promise().query(
      `
      SELECT password
      FROM User
      WHERE username = ?
      `,
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];

    // Compare the current password with the stored hashed password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ message: 'Current password is incorrect.' });
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update the password in the database
    await db.promise().query(
      `
      UPDATE User
      SET password = ?
      WHERE username = ?
      `,
      [hashedNewPassword, username]
    );

    res.json({
      message: 'Password updated successfully. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      message: 'Server error while changing password. Please try again later.',
    });
  }
});

/**
 * @route   DELETE /api/profile
 * @desc    Delete the authenticated user's account
 * @access  Protected
 */
router.delete('/profile', auth, async (req, res) => {
  try {
    const db = req.db;
    const username = req.user.id;

    // Delete the user from the database
    await db.promise().query(
      `
      DELETE FROM User
      WHERE username = ?
      `,
      [username]
    );

    res.json({ message: 'Your account has been deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({
      message: 'Server error while deleting account. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/playlists
 * @desc    Create a new playlist
 * @access  Protected
 */
router.post('/playlists', auth, async (req, res) => {
  const { name } = req.body;

  // Input validation
  if (!name) {
    return res.status(400).json({ message: 'Please provide a playlist name.' });
  }

  try {
    const db = req.db;
    const username = req.user.id;

    // Check if playlist with the same name already exists for the user
    const [existingPlaylist] = await db.promise().query(
      `
      SELECT name
      FROM Playlist
      WHERE name = ? AND username = ?
      `,
      [name, username]
    );

    if (existingPlaylist.length > 0) {
      return res.status(400).json({
        message: 'Playlist with this name already exists.',
      });
    }

    // Insert the new playlist into the database
    await db.promise().query(
      `
      INSERT INTO Playlist (name, username, creationDate)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      `,
      [name, username]
    );

    res.status(201).json({ message: 'Playlist created successfully.' });
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({
      message: 'Server error while creating playlist. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/playlists
 * @desc    Get all playlists of the authenticated user
 * @access  Protected
 */
router.get('/playlists', auth, async (req, res) => {
  try {
    const db = req.db;
    const username = req.user.id;

    // Retrieve all playlists for the user
    const [playlists] = await db.promise().query(
      `
      SELECT name, creationDate
      FROM Playlist
      WHERE username = ?
      `,
      [username]
    );

    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({
      message: 'Server error while fetching playlists. Please try again later.',
    });
  }
});

/**
 * @route   DELETE /api/playlists/:name
 * @desc    Delete a playlist by name
 * @access  Protected
 */
router.delete('/playlists/:name', auth, async (req, res) => {
  const { name } = req.params;

  try {
    const db = req.db;
    const username = req.user.id;

    // Check if the playlist exists
    const [playlist] = await db.promise().query(
      `
      SELECT name
      FROM Playlist
      WHERE name = ? AND username = ?
      `,
      [name, username]
    );

    if (playlist.length === 0) {
      return res.status(404).json({ message: 'Playlist not found.' });
    }

    // Delete the playlist; related inclusions will be deleted via ON DELETE CASCADE
    await db.promise().query(
      `
      DELETE FROM Playlist
      WHERE name = ? AND username = ?
      `,
      [name, username]
    );

    res.json({ message: 'Playlist deleted successfully.' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({
      message: 'Server error while deleting playlist. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/playlists/:name/songs
 * @desc    Add a song to a specific playlist
 * @access  Protected
 */
router.post('/playlists/:name/songs', auth, async (req, res) => {
  const { name } = req.params;
  const { songTitle, artistName, albumTitle } = req.body;

  // Input validation
  if (!songTitle || !artistName || !albumTitle) {
    return res.status(400).json({
      message: 'Please provide songTitle, artistName, and albumTitle.',
    });
  }

  try {
    const db = req.db;
    const username = req.user.id;

    // Verify that the playlist belongs to the user
    const [playlist] = await db.promise().query(
      `
      SELECT name
      FROM Playlist
      WHERE name = ? AND username = ?
      `,
      [name, username]
    );

    if (playlist.length === 0) {
      return res.status(404).json({ message: 'Playlist not found.' });
    }

    // Check if the song exists in the Song table
    const [song] = await db.promise().query(
      `
      SELECT *
      FROM Song
      WHERE songTitle = ? AND artistName = ? AND albumTitle = ?
      `,
      [songTitle, artistName, albumTitle]
    );

    if (song.length === 0) {
      return res.status(404).json({ message: 'Song not found.' });
    }

    // Check if the song is already in the playlist
    const [existingInclusion] = await db.promise().query(
      `
      SELECT *
      FROM Inclusion
      WHERE name = ? AND username = ?
        AND songTitle = ? AND artistName = ? AND albumTitle = ?
      `,
      [name, username, songTitle, artistName, albumTitle]
    );

    if (existingInclusion.length > 0) {
      return res.status(400).json({
        message: 'Song is already in the playlist.',
      });
    }

    // Insert the song into the Inclusion table
    await db.promise().query(
      `
      INSERT INTO Inclusion (name, username, songTitle, artistName, albumTitle)
      VALUES (?, ?, ?, ?, ?)
      `,
      [name, username, songTitle, artistName, albumTitle]
    );

    res.status(201).json({ message: 'Song added to playlist successfully.' });
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    res.status(500).json({
      message: 'Server error while adding song to playlist. Please try again later.',
    });
  }
});

/**
 * @route   DELETE /api/playlists/:name/songs
 * @desc    Remove a song from a specific playlist
 * @access  Protected
 */
router.delete('/playlists/:name/songs', auth, async (req, res) => {
  const { name } = req.params;
  const { songTitle, artistName, albumTitle } = req.body;

  // Input validation
  if (!songTitle || !artistName || !albumTitle) {
    return res.status(400).json({
      message: 'Please provide songTitle, artistName, and albumTitle.',
    });
  }

  try {
    const db = req.db;
    const username = req.user.id;

    // Verify that the playlist belongs to the user
    const [playlist] = await db.promise().query(
      `
      SELECT name
      FROM Playlist
      WHERE name = ? AND username = ?
      `,
      [name, username]
    );

    if (playlist.length === 0) {
      return res.status(404).json({ message: 'Playlist not found.' });
    }

    // Check if the song exists in the playlist
    const [inclusion] = await db.promise().query(
      `
      SELECT *
      FROM Inclusion
      WHERE name = ? AND username = ?
        AND songTitle = ? AND artistName = ? AND albumTitle = ?
      `,
      [name, username, songTitle, artistName, albumTitle]
    );

    if (inclusion.length === 0) {
      return res.status(404).json({ message: 'Song not found in the playlist.' });
    }

    // Delete the song from the playlist
    await db.promise().query(
      `
      DELETE FROM Inclusion
      WHERE name = ? AND username = ?
        AND songTitle = ? AND artistName = ? AND albumTitle = ?
      `,
      [name, username, songTitle, artistName, albumTitle]
    );

    res.json({ message: 'Song removed from playlist successfully.' });
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    res.status(500).json({
      message: 'Server error while removing song from playlist. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/playlists/all
 * @desc    Get all playlists created by all users
 * @access  Public
 */
router.get('/playlists/all', async (req, res) => {
  try {
    const db = req.db;

    // Retrieve all playlists with their creators
    const [playlists] = await db.promise().query(
      `
      SELECT name, username, creationDate
      FROM Playlist
      `
    );

    res.json(playlists);
  } catch (error) {
    console.error('Error fetching all playlists:', error);
    res.status(500).json({
      message: 'Server error while fetching playlists. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/playlists/:name/songs
 * @desc    Get all songs in the authenticated user's playlist by name
 * @access  Protected
 */
router.get('/playlists/:name/songs', auth, async (req, res) => {
  const { name } = req.params;

  try {
    const db = req.db;
    const username = req.user.id; // Get the authenticated user's username

    // Verify that the playlist belongs to the user
    const [playlist] = await db.promise().query(
      `
      SELECT name
      FROM Playlist
      WHERE name = ? AND username = ?
      `,
      [name, username]
    );

    if (playlist.length === 0) {
      return res.status(404).json({ message: 'Playlist not found.' });
    }

    // Retrieve all songs in the playlist
    const [songs] = await db.promise().query(
      `
      SELECT
        Song.songTitle,
        Song.artistName,
        Song.albumTitle,
        Song.duration,
        Song.plays
      FROM Inclusion
      JOIN Song ON Inclusion.songTitle = Song.songTitle
                AND Inclusion.artistName = Song.artistName
                AND Inclusion.albumTitle = Song.albumTitle
      WHERE Inclusion.name = ? AND Inclusion.username = ?
      `,
      [name, username]
    );

    res.json(songs);
  } catch (error) {
    console.error('Error fetching songs in playlist:', error);
    res.status(500).json({
      message: 'Server error while fetching songs. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/playlists/:username/:name/songs
 * @desc    Get all songs in a specific playlist by name and username
 * @access  Public
 */
router.get('/playlists/:username/:name/songs', async (req, res) => {
  const { username, name } = req.params;

  try {
    const db = req.db;

    // Verify that the playlist exists
    const [playlist] = await db.promise().query(
      `
      SELECT name
      FROM Playlist
      WHERE name = ? AND username = ?
      `,
      [name, username]
    );

    if (playlist.length === 0) {
      return res.status(404).json({ message: 'Playlist not found.' });
    }

    // Retrieve all songs in the playlist
    const [songs] = await db.promise().query(
      `
      SELECT
        Song.songTitle,
        Song.artistName,
        Song.albumTitle,
        Song.duration,
        Song.plays
      FROM Inclusion
      JOIN Song ON Inclusion.songTitle = Song.songTitle
                AND Inclusion.artistName = Song.artistName
                AND Inclusion.albumTitle = Song.albumTitle
      WHERE Inclusion.name = ? AND Inclusion.username = ?
      `,
      [name, username]
    );

    res.json(songs);
  } catch (error) {
    console.error('Error fetching songs in playlist:', error);
    res.status(500).json({
      message: 'Server error while fetching songs. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/top-charts
 * @desc    Get all unique top chart names
 * @access  Public
 */
router.get('/top-charts', async (req, res) => {
  try {
    const db = req.db;

    // Retrieve distinct top chart names
    const [topCharts] = await db.promise().query(
      `
      SELECT DISTINCT chartName
      FROM TopChart
      `
    );

    res.json(topCharts);
  } catch (error) {
    console.error('Error fetching top chart names:', error);
    res.status(500).json({
      message: 'Server error while fetching top charts. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/top-charts/:name/dates
 * @desc    Get all available dates for a specific top chart
 * @access  Public
 */
router.get('/top-charts/:name/dates', async (req, res) => {
  const { name } = req.params;

  try {
    const db = req.db;

    // Retrieve all dates for the specified top chart name
    const [dates] = await db.promise().query(
      `
      SELECT chartDate
      FROM TopChart
      WHERE chartName = ?
      ORDER BY chartDate DESC
      `,
      [name]
    );

    if (dates.length === 0) {
      return res.status(404).json({
        message: 'Top chart not found or no dates available.',
      });
    }

    res.json(dates);
  } catch (error) {
    console.error(`Error fetching dates for top chart "${name}":`, error);
    res.status(500).json({
      message: 'Server error while fetching dates. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/top-charts/:name/:date/songs
 * @desc    Get all songs in a specific top chart on a specific date
 * @access  Public
 */
router.get('/top-charts/:name/:date/songs', async (req, res) => {
  const { name, date } = req.params;

  try {
    const db = req.db;

    // Verify that the TopChart exists
    const [topChartRows] = await db.promise().query(
      `
      SELECT *
      FROM TopChart
      WHERE chartName = ? AND chartDate = ?
      `,
      [name, date]
    );

    if (topChartRows.length === 0) {
      return res.status(404).json({
        message: 'Top chart not found for the specified name and date.',
      });
    }

    // Retrieve all songs associated with the specified chartName and chartDate
    const [songs] = await db.promise().query(
      `
      SELECT
        Song.songTitle,
        Song.artistName,
        Song.albumTitle,
        Song.duration,
        Song.plays
      FROM ChartEntry
      JOIN Song ON ChartEntry.songTitle = Song.songTitle
                AND ChartEntry.artistName = Song.artistName
                AND ChartEntry.albumTitle = Song.albumTitle
      WHERE ChartEntry.chartName = ? AND ChartEntry.chartDate = ?
      ORDER BY Song.plays DESC
      `,
      [name, date]
    );

    res.json(songs);
  } catch (error) {
    console.error(
      `Error fetching songs for top chart "${name}" on "${date}":`,
      error
    );
    res.status(500).json({
      message: 'Server error while fetching songs. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/recommendations
 * @desc    Get song recommendations based on user's likes
 * @access  Protected
 */
router.get('/recommendations', auth, async (req, res) => {
  const username = req.user.id;

  const query = `
    SELECT
      s.songTitle,
      s.artistName,
      s.albumTitle,
      s.duration,
      s.plays,
      c.genreName,
      (
        3 * COUNT(DISTINCT a.artistName)
        + 2 * COUNT(DISTINCT al.albumTitle)
        + 1 * COUNT(DISTINCT g.genreName)
      ) AS score
    FROM Song s
    JOIN Classification c ON s.songTitle = c.songTitle
                          AND s.artistName = c.artistName
                          AND s.albumTitle = c.albumTitle
    LEFT JOIN (
      SELECT DISTINCT artistName
      FROM UserLike
      WHERE username = ?
    ) AS a ON s.artistName = a.artistName
    LEFT JOIN (
      SELECT DISTINCT albumTitle
      FROM UserLike
      WHERE username = ?
    ) AS al ON s.albumTitle = al.albumTitle
    LEFT JOIN (
      SELECT DISTINCT c2.genreName
      FROM UserLike ul
      JOIN Classification c2 ON ul.songTitle = c2.songTitle
                            AND ul.artistName = c2.artistName
                            AND ul.albumTitle = c2.albumTitle
      WHERE ul.username = ?
    ) AS g ON c.genreName = g.genreName
    WHERE NOT EXISTS (
      SELECT 1
      FROM UserLike ul2
      WHERE ul2.username = ?
        AND ul2.songTitle = s.songTitle
        AND ul2.artistName = s.artistName
        AND ul2.albumTitle = s.albumTitle
    )
    GROUP BY
      s.songTitle,
      s.artistName,
      s.albumTitle,
      s.duration,
      s.plays,
      c.genreName
    HAVING (
      3 * COUNT(DISTINCT a.artistName)
      + 2 * COUNT(DISTINCT al.albumTitle)
      + 1 * COUNT(DISTINCT g.genreName)
    ) > 0
    ORDER BY score DESC, s.plays DESC;
  `;

  try {
    // Prepare the parameters for the query
    const params = [
      username,
      username,
      username,
      username,
      username,
      username,
      username,
    ];

    const [rows] = await req.db.promise().query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      message: 'Server error while fetching recommendations. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/likes
 * @desc    Get all songs liked by the authenticated user
 * @access  Protected
 */
router.get('/likes', auth, async (req, res) => {
  const username = req.user.id; // Extract username from authenticated user

  const query = `
    SELECT
      s.songTitle,
      s.artistName,
      s.albumTitle,
      s.duration,
      s.plays
    FROM UserLike ul
    JOIN Song s ON ul.songTitle = s.songTitle
              AND ul.artistName = s.artistName
              AND ul.albumTitle = s.albumTitle
    WHERE ul.username = ?
  `;

  try {
    const [rows] = await req.db.promise().query(query, [username]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching liked songs:', error);
    res.status(500).json({
      message: 'Server error while fetching liked songs. Please try again later.',
    });
  }
});

/**
 * @route   POST /api/likes
 * @desc    Like a song
 * @access  Protected
 */
router.post('/likes', auth, async (req, res) => {
  const username = req.user.id;
  const { songTitle, artistName, albumTitle } = req.body;

  // Input validation
  if (!songTitle || !artistName || !albumTitle) {
    return res.status(400).json({
      message: 'Please provide songTitle, artistName, and albumTitle.',
    });
  }

  try {
    const db = req.db;

    // Check if the song exists
    const [songExists] = await db.promise().query(
      `
      SELECT *
      FROM Song
      WHERE songTitle = ? AND artistName = ? AND albumTitle = ?
      `,
      [songTitle, artistName, albumTitle]
    );

    if (songExists.length === 0) {
      return res.status(404).json({ message: 'Song not found.' });
    }

    // Check if the song is already liked
    const [alreadyLiked] = await db.promise().query(
      `
      SELECT *
      FROM UserLike
      WHERE username = ?
        AND songTitle = ?
        AND artistName = ?
        AND albumTitle = ?
      `,
      [username, songTitle, artistName, albumTitle]
    );

    if (alreadyLiked.length > 0) {
      return res.status(400).json({ message: 'Song is already liked.' });
    }

    // Insert into UserLike with likeDate
    await db.promise().query(
      `
      INSERT INTO UserLike (username, songTitle, artistName, albumTitle, likeDate)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `,
      [username, songTitle, artistName, albumTitle]
    );

    res.status(201).json({ message: 'Song liked successfully.' });
  } catch (error) {
    console.error('Error liking song:', error);
    res.status(500).json({
      message: 'Server error while liking song. Please try again later.',
    });
  }
});

/**
 * @route   DELETE /api/likes
 * @desc    Unlike a song
 * @access  Protected
 */
router.delete('/likes', auth, async (req, res) => {
  const username = req.user.id;
  const { songTitle, artistName, albumTitle } = req.body;

  // Input validation
  if (!songTitle || !artistName || !albumTitle) {
    return res.status(400).json({
      message: 'Please provide songTitle, artistName, and albumTitle.',
    });
  }

  try {
    const db = req.db;

    // Check if the song is liked
    const [likedSong] = await db.promise().query(
      `
      SELECT *
      FROM UserLike
      WHERE username = ?
        AND songTitle = ?
        AND artistName = ?
        AND albumTitle = ?
      `,
      [username, songTitle, artistName, albumTitle]
    );

    if (likedSong.length === 0) {
      return res
        .status(404)
        .json({ message: 'Song is not in your liked songs.' });
    }

    // Delete from UserLike
    await db.promise().query(
      `
      DELETE FROM UserLike
      WHERE username = ?
        AND songTitle = ?
        AND artistName = ?
        AND albumTitle = ?
      `,
      [username, songTitle, artistName, albumTitle]
    );

    res.json({ message: 'Song unliked successfully.' });
  } catch (error) {
    console.error('Error unliking song:', error);
    res.status(500).json({
      message: 'Server error while unliking song. Please try again later.',
    });
  }
});

/**
 * @route   GET /api/users/:username/profile
 * @desc    Get public profile information of a user by username
 * @access  Public
 */
router.get('/users/:username/profile', async (req, res) => {
  const { username } = req.params;

  try {
    const db = req.db;

    // Retrieve user data excluding the password and email
    const [users] = await db.promise().query(
      `
      SELECT username, bio
      FROM User
      WHERE username = ?
      `,
      [username]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = users[0];

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      message: 'Server error while fetching user profile. Please try again later.',
    });
  }
});

// Make sure to place this route before any routes that might conflict

// Export the router to be used in server.js
module.exports = router;
