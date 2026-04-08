'use client';

import { useState, useEffect } from 'react';
import {
  fetchFreelancerPFI,
  fetchPFIByMe,
  fetchPFISuggestions,
  fetchPFISuggestionsByMe,
  fetchPFIHistory,
  fetchPFIHistoryByMe
} from '../services/api';
import { getStoredAuth } from '../services/auth';
import PFIScoreCard from './PFIScoreCard';

const PFIDashboard = ({ freelancerId }) => {
  const [pfiData, setPfiData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadPFIData = async () => {
      try {
        setLoading(true);
        setError(null);

        const auth = getStoredAuth();
        const token = auth?.token;
        const targetId = freelancerId || auth?.user?.id;

        if (!targetId && !token) {
          setError('Please sign in to view your PFI dashboard.');
          return;
        }

        const useMeEndpoint = token && !freelancerId;
        const pfiResponse = useMeEndpoint
          ? await fetchPFIByMe(token)
          : await fetchFreelancerPFI(targetId);

        setPfiData(pfiResponse.data.data);

        try {
          const suggestionsResponse = useMeEndpoint
            ? await fetchPFISuggestionsByMe(token)
            : await fetchPFISuggestions(targetId);
          setSuggestions(suggestionsResponse.data.data?.suggestions || []);
        } catch (suggestionError) {
          console.warn('PFI suggestions failed:', suggestionError);
          setSuggestions([]);
        }

        try {
          const historyResponse = useMeEndpoint
            ? await fetchPFIHistoryByMe(token, 5)
            : await fetchPFIHistory(targetId, 5);
          setHistory(historyResponse.data.data || []);
        } catch (historyError) {
          console.warn('PFI history failed:', historyError);
          setHistory([]);
        }
      } catch (err) {
        console.error('Failed to load PFI data:', err);
        setError(err.response?.data?.message || 'Failed to load PFI data');
      } finally {
        setLoading(false);
      }
    };

    loadPFIData();
  }, [freelancerId]);

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'breakdown', label: 'Breakdown' },
    { id: 'history', label: 'History' },
    { id: 'suggestions', label: 'Improve Score' }
  ];

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <h3 className="text-base font-semibold text-rose-800 mb-2">PFI Dashboard Unavailable</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Professional Fidelity Index</h2>
        <div className="text-sm text-slate-500">
          Last updated: {pfiData?.last_updated ? new Date(pfiData.last_updated).toLocaleDateString() : 'Never'}
        </div>
      </div>

      <PFIScoreCard freelancerId={freelancerId} initialData={pfiData} />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">What is PFI?</h3>
              <p className="text-sm text-slate-600 mb-4">
                Your Professional Fidelity Index (PFI) measures your reliability and trustworthiness
                as a freelancer. It combines factors like project completion, client satisfaction,
                responsiveness, and verification status.
              </p>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="text-sm text-slate-700">
                  <strong>Current Status:</strong> {pfiData?.status}
                </div>
                <div className="text-sm text-slate-700 mt-1">
                  <strong>Score Range:</strong> {pfiData?.score >= 90 ? 'Excellent (90-100)' :
                                                pfiData?.score >= 80 ? 'Very Good (80-89)' :
                                                pfiData?.score >= 70 ? 'Good (70-79)' :
                                                pfiData?.score >= 60 ? 'Fair (60-69)' :
                                                'Needs Improvement (0-59)'}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Profile Completeness</span>
                  <span className="text-sm font-medium">{pfiData?.factor_breakdown?.profile_completeness || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Milestone Completion</span>
                  <span className="text-sm font-medium">{pfiData?.factor_breakdown?.milestone_completion || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Client Ratings</span>
                  <span className="text-sm font-medium">{pfiData?.factor_breakdown?.client_ratings || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Verification</span>
                  <span className="text-sm font-medium">{pfiData?.factor_breakdown?.verification || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'breakdown' && pfiData?.factor_breakdown && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Detailed Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(pfiData.factor_breakdown).map(([factor, value]) => (
                <div key={factor} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {factor.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-slate-900 font-medium">{value}/100</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {getFactorDescription(factor)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Score History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">No history available yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <div key={entry._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{entry.score}/100</div>
                      <div className="text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        entry.score > (history[index + 1]?.score || 0) ? 'text-green-600' :
                        entry.score < (history[index + 1]?.score || 0) ? 'text-red-600' :
                        'text-slate-600'
                      }`}>
                        {entry.score > (history[index + 1]?.score || 0) ? '↗️ +' :
                         entry.score < (history[index + 1]?.score || 0) ? '↘️ ' :
                         '➡️ '}
                        {Math.abs(entry.score - (history[index + 1]?.score || entry.score))}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">
                        {entry.triggered_by.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Ways to Improve Your Score</h3>
            {suggestions.length === 0 ? (
              <p className="text-sm text-slate-500">Great job! No major improvements needed right now.</p>
            ) : (
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-900">{suggestion.title}</h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        suggestion.impact === 'High' ? 'bg-red-100 text-red-800' :
                        suggestion.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {suggestion.impact} Impact
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get factor descriptions
const getFactorDescription = (factor) => {
  const descriptions = {
    profile_completeness: 'How complete your freelancer profile is with skills, experience, and contact information.',
    verification: 'Whether you have verified accounts (GitHub, portfolio) and identity verification.',
    proposal_acceptance: 'Percentage of project proposals that get accepted by clients.',
    milestone_completion: 'Rate at which you complete assigned project milestones.',
    on_time_delivery: 'Percentage of deliverables submitted on or before deadlines.',
    client_ratings: 'Average rating received from clients on completed projects.',
    review_sentiment: 'Overall sentiment analysis of client reviews and feedback.',
    rehire_rate: 'Percentage of clients who hire you again for future projects.',
    responsiveness: 'How quickly you respond to client messages and inquiries.',
    risk_penalty: 'Penalties for disputes, refunds, or failed escrow transactions.'
  };
  return descriptions[factor] || 'Factor description not available.';
};

export default PFIDashboard;