'use client';

import { useState, useEffect } from 'react';
import { fetchFreelancerPFI, fetchPFIByMe } from '../services/api';
import { getStoredAuth } from '../services/auth';

const PFIScoreCard = ({ freelancerId, compact = false, initialData = null }) => {
  const [pfiData, setPfiData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPFIData = async () => {
      if (initialData) {
        return;
      }

      try {
        setLoading(true);
        const auth = getStoredAuth();
        const token = auth?.token;
        const targetId = freelancerId || auth?.user?.id;

        if (!targetId && !token) {
          setError('Login required to load PFI score');
          return;
        }

        const response = token && !freelancerId
          ? await fetchPFIByMe(token)
          : await fetchFreelancerPFI(targetId);

        setPfiData(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load PFI score');
      } finally {
        setLoading(false);
      }
    };

    loadPFIData();
  }, [freelancerId, initialData]);

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!pfiData) return null;

  const { score, status, trend, factor_breakdown } = pfiData;

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Excellent': return 'text-emerald-600 bg-emerald-50';
      case 'Very Good': return 'text-green-600 bg-green-50';
      case 'Good': return 'text-blue-600 bg-blue-50';
      case 'Fair': return 'text-yellow-600 bg-yellow-50';
      case 'Needs Improvement': return 'text-orange-600 bg-orange-50';
      default: return 'text-red-600 bg-red-50';
    }
  };

  // Get trend icon
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'new': return '🆕';
      default: return '➡️';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-slate-200">
        <div className="text-2xl font-bold text-slate-900">{score}</div>
        <div className="flex-1">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status} {getTrendIcon(trend)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">PFI Score</h3>
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
          {status} {getTrendIcon(trend)}
        </div>
      </div>

      <div className="text-center">
        <div className="text-5xl font-bold text-slate-900 mb-2">{score}</div>
        <div className="text-sm text-slate-500">out of 100</div>
      </div>

      {/* Score breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-700">Score Breakdown</h4>
        <div className="space-y-1">
          {Object.entries(factor_breakdown).map(([factor, value]) => (
            <div key={factor} className="flex items-center justify-between text-sm">
              <span className="text-slate-600 capitalize">
                {factor.replace(/_/g, ' ')}
              </span>
              <span className="font-medium text-slate-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Progress</span>
          <span>{score}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${score}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default PFIScoreCard;