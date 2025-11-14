const path = require('path');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..');

const app = createApp({ rootDir: ROOT_DIR });

app.listen(PORT, () => {
  console.log(`NervDash server running at http://localhost:${PORT}`);
});
