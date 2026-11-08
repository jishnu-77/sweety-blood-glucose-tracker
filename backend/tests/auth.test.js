const request = require('supertest');
const { app, pool, resetDatabase, registerUser, authHeader } = require('./helpers');

beforeEach(resetDatabase);
afterAll(() => pool.end());

describe('POST /api/auth/register', () => {
  test('creates a user, returns a token and stores only a bcrypt hash', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'Asha@Example.com', password: 'secret-pass' });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toEqual({ id: expect.any(Number), name: 'Asha', email: 'asha@example.com' });
    expect(JSON.stringify(response.body)).not.toContain('secret-pass');

    const { rows } = await pool.query('SELECT password FROM users');
    expect(rows[0].password).not.toBe('secret-pass');
    expect(rows[0].password).toMatch(/^\$2[aby]\$/);
  });

  test('rejects a duplicate email, ignoring letter case', async () => {
    await registerUser({ email: 'dup@example.com' });
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'DUP@example.com', password: 'password123' });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe('An account with this email already exists.');
  });

  test('validates name, email and password', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'nope', password: 'short' });

    expect(response.status).toBe(400);
    expect(Object.keys(response.body.errors).sort()).toEqual(['email', 'name', 'password']);
  });

  test('rejects malformed JSON with a 400', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{"name": ');
    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials', async () => {
    const { body } = await registerUser({ email: 'login@example.com', password: 'password123' });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'LOGIN@example.com', password: body.password });

    expect(response.status).toBe(200);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toBe('login@example.com');
  });

  test('gives the same error for a wrong password and an unknown email', async () => {
    await registerUser({ email: 'known@example.com', password: 'password123' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'known@example.com', password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'password123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Invalid email or password.');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  test('requires email and password', async () => {
    const response = await request(app).post('/api/auth/login').send({});
    expect(response.status).toBe(400);
  });
});

describe('protected routes', () => {
  test('GET /api/auth/me returns the current user', async () => {
    const { token, user } = await registerUser();
    const response = await request(app).get('/api/auth/me').set(authHeader(token));
    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(user.id);
  });

  test.each(['/api/auth/me', '/api/readings', '/api/reports/daily'])(
    '%s requires a token',
    async (path) => {
      const response = await request(app).get(path);
      expect(response.status).toBe(401);
    }
  );

  test('rejects an invalid token', async () => {
    const response = await request(app).get('/api/readings').set(authHeader('not.a.token'));
    expect(response.status).toBe(401);
  });
});
