import React, { useState, useEffect } from 'react';
import { getTags, refreshTags } from '../../services/apiService';

function AdminView() {
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTags = async () => {
    const response = await getTags();
    setTags(response.data);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    await refreshTags();
    await fetchTags();
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
      <ul className="tag-list">
        {tags.map(tag => (
          <li key={tag.tag_id}>{tag.name}</li>
        ))}
      </ul>
    </div>
  );
}
export default AdminView;