const db = require('../database');
const shipstationApi = require('../api/shipstation');

// Fetches tags from ShipStation and updates the local DB
const refreshTagsFromShipStation = async () => {
  console.log('Refreshing tags from ShipStation...');
  const tags = await shipstationApi.fetchTags();
  if (!tags || !Array.isArray(tags)) {
    console.error('Failed to refresh tags: Invalid data from ShipStation.');
    return;
  }

  const insert = db.prepare('INSERT OR REPLACE INTO tags (tag_id, name) VALUES (?, ?)');
  const refreshTransaction = db.transaction((tagList) => {
    for (const tag of tagList) {
      insert.run(tag.tagId, tag.name);
    }
  });

  refreshTransaction(tags);
  console.log(`Successfully refreshed ${tags.length} tags.`);
};

// Gets all tags from the local DB
const getAllTags = () => {
  return db.prepare('SELECT * FROM tags ORDER BY name').all();
};

module.exports = {
  refreshTagsFromShipStation,
  getAllTags
};