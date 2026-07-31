const configureRoutes = (app) => {
  app.use('/api/auth', require('./api/auth'));
  app.use('/api/users', require('./api/users'));
  app.use('/api/chips', require('./api/chips'));
  app.use('/api/players', require('./api/players'));

  // Exact root match only
  app.get('/', (req, res) => {
    res.status(200).send('GGLab API Documents');
  });

  // Catch-all 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });
};

module.exports = configureRoutes;
