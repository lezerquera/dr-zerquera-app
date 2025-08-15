import app from './server';

const port = process.env.PORT || 3001;

// This file is used to start the server in traditional environments (local, Render)
// where the process is expected to listen on a port.
app.listen(port, () => {
    console.log(`Backend server is listening on http://localhost:${port}`);
});
