const express = require('express');
const router = express.Router();
const tagService = require('../services/tagService');

router.get('/tags', (req, res) => {
  res.json(tagService.getAllTags());
});

router.post('/tags/refresh', async (req, res) => {
  try {
    await tagService.refreshTagsFromShipStation();
    res.status(200).json({ message: 'Tags refreshed successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to refresh tags.' });
  }
});

module.exports = router;