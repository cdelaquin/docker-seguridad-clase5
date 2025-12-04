const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Variables de entorno
const PORT = process.env.PORT || 5000;
const DB_HOST = process.env.DB_HOST || 'db';
const DB_USER = process.env.DB_USER || 'user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'password';
const DB_NAME = process.env.DB_NAME || 'postsdb';
const DB_PORT = process.env.DB_PORT || 5432;

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Conexión PostgreSQL
const pool = new Pool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
});

// Conexión Redis
const redisClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

redisClient.on('error', (err) => console.error('Redis error', err));

// Inicialización
async function init() {
  await redisClient.connect();

  // Crear tabla si no existe
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('DB ready, Redis ready');
}

// Helper para cache
const POSTS_LIST_KEY = 'posts:all';

async function getAllPosts() {
  const res = await pool.query('SELECT * FROM posts ORDER BY id DESC;');
  return res.rows;
}

async function getPostById(id) {
  const res = await pool.query('SELECT * FROM posts WHERE id = $1;', [id]);
  return res.rows[0];
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1;');
    await redisClient.ping();
    res.json({ status: 'ok', db: 'ok', redis: 'ok' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// GET /api/posts - con cache
app.get('/api/posts', async (req, res) => {
  try {
    const cached = await redisClient.get(POSTS_LIST_KEY);
    if (cached) {
      console.log('Cache HIT: /api/posts');
      return res.json({
        source: 'cache',
        data: JSON.parse(cached),
      });
    }

    console.log('Cache MISS: /api/posts');
    const posts = await getAllPosts();
    await redisClient.set(POSTS_LIST_KEY, JSON.stringify(posts));
    res.json({
      source: 'database',
      data: posts,
    });
  } catch (err) {
    console.error('Error GET /api/posts', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/posts/:id - con cache
app.get('/api/posts/:id', async (req, res) => {
  const id = req.params.id;
  const key = `posts:${id}`;

  try {
    const cached = await redisClient.get(key);
    if (cached) {
      console.log(`Cache HIT: /api/posts/${id}`);
      return res.json({
        source: 'cache',
        data: JSON.parse(cached),
      });
    }

    console.log(`Cache MISS: /api/posts/${id}`);
    const post = await getPostById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await redisClient.set(key, JSON.stringify(post));
    res.json({
      source: 'database',
      data: post,
    });
  } catch (err) {
    console.error(`Error GET /api/posts/${id}`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/posts - invalida cache
app.post('/api/posts', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'title and content required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO posts (title, content) VALUES ($1, $2) RETURNING *;',
      [title, content]
    );
    const newPost = result.rows[0];

    // Invalidar cache de lista y post individual
    console.log('Invalidando cache de posts');
    await redisClient.del(POSTS_LIST_KEY);
    await redisClient.del(`posts:${newPost.id}`);

    res.status(201).json({
      message: 'Post created',
      data: newPost,
    });
  } catch (err) {
    console.error('Error POST /api/posts', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Iniciar servidor
init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Posts service listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error initializing app', err);
    process.exit(1);
  });
