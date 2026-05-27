import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import moduleRoutes from './routes/modules';
import recommendationRoutes from './routes/recommendations';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Courseway API is running' });
});

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/modules', moduleRoutes);
app.use('/recommendations', recommendationRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});