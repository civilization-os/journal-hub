const { app } = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Journal Hub Backend running on http://localhost:${PORT}`);
});

module.exports = app;
