// Dashboard.js
// Add your component here

import React from 'react';

const handleBrowseJobs = () => {
  // Fetch jobs from backend
  fetch('/list')
    .then(response => response.json())
    .then(data => {
      // Update UI with job data
      console.log('Jobs fetched:', data)
    })
};

const handleFindAIMatches = () => {
  // Trigger AI matching logic
  fetch('/matches')
    .then(response => response.json())
    .then(data => {
      // Display AI matches
      console.log('AI matches found:', data)
    })
};

const Dashboard = () => {
  return (
    <div>
      <button onClick={handleBrowseJobs}>Browse Jobs</button>
      <button onClick={handleFindAIMatches}>Find AI Matches</button>
    </div>
  );
};
export default Dashboard;
