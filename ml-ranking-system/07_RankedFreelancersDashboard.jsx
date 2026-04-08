import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RankedFreelancersDashboard.css';

/**
 * RankedFreelancersDashboard Component
 * Displays ML-ranked freelancers for a project with:
 * - Ranking position and score
 * - ML insights (strengths, risks)
 * - Success probability
 * - Feature breakdown
 */

const RankedFreelancersDashboard = ({ jobId, onFreelancerSelect }) => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [totalProposals, setTotalProposals] = useState(0);

  const ML_API_BASE = process.env.REACT_APP_ML_API || 'http://localhost:8000';

  // Fetch ranked freelancers on component mount
  useEffect(() => {
    if (jobId) {
      fetchRankedFreelancers();
    }
  }, [jobId]);

  const fetchRankedFreelancers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${ML_API_BASE}/api/projects/${jobId}/interested-freelancers-ranked?top_n=20`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        }
      );

      setRankings(response.data.ranked_freelancers || []);
      setJobTitle(response.data.job_title);
      setTotalProposals(response.data.total_proposals);
    } catch (err) {
      console.error('Error fetching rankings:', err);
      setError('Failed to load ranked freelancers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFreelancer = (freelancer) => {
    setSelectedFreelancer(freelancer);
    if (onFreelancerSelect) {
      onFreelancerSelect(freelancer.freelancer_id, freelancer.proposal_id);
    }
  };

  const getRankBadgeColor = (position) => {
    if (position === 1) return '#FFD700'; // Gold
    if (position === 2) return '#C0C0C0'; // Silver
    if (position === 3) return '#CD7F32'; // Bronze
    return '#5B9BD5'; // Blue
  };

  const FeatureBar = ({ label, value, max = 1 }) => {
    const percentage = Math.min((value / max) * 100, 100);
    return (
      <div className="feature-bar-container">
        <label className="feature-label">{label}</label>
        <div className="feature-bar">
          <div
            className="feature-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="feature-value">{value.toFixed(2)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="ranked-freelancers-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Analyzing proposals with ML...</p>
        </div>
      </div>
    );
  }

  if (error || rankings.length === 0) {
    return (
      <div className="ranked-freelancers-container">
        <div className="error-message">
          {error || 'No proposals found for this project'}
        </div>
      </div>
    );
  }

  return (
    <div className="ranked-freelancers-container">
      <div className="rankings-header">
        <div>
          <h2>🤖 ML-Ranked Freelancers</h2>
          <p className="subtitle">Pure ML ranking • {totalProposals} proposals analyzed</p>
        </div>
        <button className="refresh-button" onClick={fetchRankedFreelancers}>
          🔄 Refresh Rankings
        </button>
      </div>

      <div className="rankings-grid">
        {rankings.map((freelancer, index) => (
          <div
            key={freelancer.freelancer_id}
            className={`freelancer-card ${selectedFreelancer?.freelancer_id === freelancer.freelancer_id ? 'selected' : ''}`}
            onClick={() => handleSelectFreelancer(freelancer)}
          >
            {/* Rank Badge */}
            <div
              className="rank-badge"
              style={{ backgroundColor: getRankBadgeColor(freelancer.rank_position) }}
            >
              #{freelancer.rank_position}
            </div>

            {/* Success Probability */}
            <div className="success-indicator">
              <div className="success-circle">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" />
                </svg>
                <div className="success-text">
                  {(freelancer.ml_insight.estimated_success_probability * 100).toFixed(0)}%
                </div>
              </div>
              <span className="success-label">Success Probability</span>
            </div>

            {/* Freelancer Info */}
            <div className="freelancer-info">
              <h3>{freelancer.freelancer_name}</h3>
              <p className="title">{freelancer.freelancer_title}</p>
            </div>

            {/* ML Score */}
            <div className="ml-score-section">
              <div className="score-label">ML Ranking Score</div>
              <div className="score-value">{freelancer.ml_ranking_score.toFixed(4)}</div>
              <div className="score-bar">
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${Math.min((freelancer.ml_ranking_score / 10) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Top Strengths */}
            {freelancer.ml_insight.top_strengths.length > 0 && (
              <div className="strengths-section">
                <div className="section-title">✓ Top Strengths</div>
                <ul className="strengths-list">
                  {freelancer.ml_insight.top_strengths.map((strength, i) => (
                    <li key={i}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Top Risks */}
            {freelancer.ml_insight.top_risks.length > 0 && (
              <div className="risks-section">
                <div className="section-title">⚠ Considerations</div>
                <ul className="risks-list">
                  {freelancer.ml_insight.top_risks.map((risk, i) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* View Details Button */}
            <button className="view-details-button">View Full Details</button>
          </div>
        ))}
      </div>

      {/* Detailed View Panel */}
      {selectedFreelancer && (
        <SelectedFreelancerPanel
          freelancer={selectedFreelancer}
          onClose={() => setSelectedFreelancer(null)}
        />
      )}
    </div>
  );
};

/**
 * SelectedFreelancerPanel
 * Shows detailed ML insights for selected freelancer
 */
const SelectedFreelancerPanel = ({ freelancer, onClose }) => {
  return (
    <div className="detail-panel-overlay">
      <div className="detail-panel">
        <button className="close-button" onClick={onClose}>✕</button>

        <div className="panel-header">
          <h2>{freelancer.freelancer_name}</h2>
          <p className="title">{freelancer.freelancer_title}</p>
        </div>

        <div className="panel-content">
          {/* Success Metrics */}
          <section className="section">
            <h3>Success Metrics</h3>
            <div className="metrics-grid">
              <MetricCard
                label="ML Score"
                value={freelancer.ml_ranking_score.toFixed(4)}
                color="#3498db"
              />
              <MetricCard
                label="Success Probability"
                value={`${(freelancer.ml_insight.estimated_success_probability * 100).toFixed(0)}%`}
                color="#2ecc71"
              />
              <MetricCard
                label="Confidence"
                value={`${(freelancer.confidence_score * 100).toFixed(0)}%`}
                color="#9b59b6"
              />
              <MetricCard
                label="Percentile Rank"
                value={`${freelancer.percentile_rank.toFixed(0)}th`}
                color="#e74c3c"
              />
            </div>
          </section>

          {/* Feature Analysis */}
          <section className="section">
            <h3>Feature Analysis</h3>
            <div className="features-breakdown">
              <FeatureBreakdown
                label="Semantic Match"
                value={freelancer.features.semantic_similarity_job_proposal}
                description="Proposal-Job alignment"
              />
              <FeatureBreakdown
                label="Skill Overlap"
                value={freelancer.features.skill_overlap_percentage}
                max={100}
                description="Required skills covered"
              />
              <FeatureBreakdown
                label="Price Fit"
                value={freelancer.features.price_fit_score}
                description="Bid competitiveness"
              />
              <FeatureBreakdown
                label="Profile Strength"
                value={freelancer.features.profile_completeness}
                max={100}
                description="Profile completeness %"
              />
              <FeatureBreakdown
                label="Reliability Score"
                value={
                  (freelancer.features.completion_rate +
                    freelancer.features.on_time_rate +
                    freelancer.features.average_rating * 20) /
                  3
                }
                max={100}
                description="Completion + On-time + Rating"
              />
            </div>
          </section>

          {/* Strengths & Risks */}
          <div className="strengths-risks-grid">
            <section className="section">
              <h3>✓ Why This Freelancer Stands Out</h3>
              <ul className="detail-list">
                {freelancer.ml_insight.top_strengths.map((strength, i) => (
                  <li key={i}>{strength}</li>
                ))}
              </ul>
            </section>

            <section className="section">
              <h3>⚠ Areas to Consider</h3>
              <ul className="detail-list">
                {freelancer.ml_insight.top_risks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* Contact Info */}
          <section className="section">
            <h3>Next Steps</h3>
            <button className="action-button primary">Send Interview Request</button>
            <button className="action-button secondary">View Full Profile</button>
          </section>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, color }) => (
  <div className="metric-card" style={{ borderLeftColor: color }}>
    <div className="metric-label">{label}</div>
    <div className="metric-value" style={{ color }}>
      {value}
    </div>
  </div>
);

const FeatureBreakdown = ({ label, value, max = 1, description }) => (
  <div className="feature-row">
    <div className="feature-info">
      <div className="feature-title">{label}</div>
      <div className="feature-description">{description}</div>
    </div>
    <div className="feature-bar-container">
      <div className="feature-bar">
        <div
          className="feature-bar-fill"
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        />
      </div>
      <div className="feature-value">{value.toFixed(2)}</div>
    </div>
  </div>
);

export default RankedFreelancersDashboard;
