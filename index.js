const app = require('./app');

const PORT = process.env.PORT || 2314;

const server = app.listen(PORT, () => {
    console.log('server is running on port', server.address().port);
});