import express from 'express';
import logger from '../utils/logger';
import { ScoringService } from '../services/scoringService';

const router = express.Router();

// Get leaderboard for a season
router.get('/season/:seasonId', async (req, res) => {
  const seasonId = parseInt(req.params.seasonId);

  try {
    const result = await ScoringService.calculateLeaderboard(seasonId);
    res.json(result);
  } catch (error) {
    logger.error('Get leaderboard error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

// Get cumulative points history for graphing
router.get('/season/:seasonId/graph', async (req, res) => {
  const seasonId = parseInt(req.params.seasonId);

  try {
    const graphData = await ScoringService.calculateCumulativeGraph(seasonId);
    res.json(graphData);
  } catch (error) {
    logger.error('Get cumulative graph error', { error, seasonId });
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
