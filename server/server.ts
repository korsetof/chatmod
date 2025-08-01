import * as express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
    res.send('Server is running!');
});

app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}`);
});
