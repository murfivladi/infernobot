process.env.NODE_NO_WARNINGS = '1';

const express = require('express');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(routes);

app.listen(PORT, () => {
  console.log(`vladx registry in ascolto su http://localhost:${PORT}`);
});
