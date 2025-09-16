import React, { useState, useEffect } from 'react';
import { getTags, refreshTags } from '../../services/apiService';

function AdminView() {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTags = async () => {
    try {
      const response = await getTags();
      setTags(response.data);
    } catch (error) {
      console.error("Failed to fetch tags", error);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshTags();
      await fetchTags();
    } catch (error) {
      alert('Failed to refresh tags.');
    }
    setIsLoading(false);
  };

  return (
    <div>
      <div className="dashboard-header">
        <h2>Tag Management</h2>
        <button className="fetch-button" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Tags from ShipStation'}
        </button>
      </div>
      <p>This is a list of all tags synced from your ShipStation account. They are updated automatically once a day.</p>
      <div className="tag-list">
        {tags.map(tag => (
          <span key={tag.tag_id} className="tag-chip admin-tag">{tag.name}</span>
        ))}
      </div>
    </div>
  );
}

export default AdminView;