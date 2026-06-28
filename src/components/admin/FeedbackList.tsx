'use client';

import { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface FeedbackItem {
  id: string;
  message: string;
  rating: number | null;
  email: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    username: string | null;
  } | null;
}

interface FeedbackStats {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Array<{
    rating: number;
    count: number;
  }>;
}

interface FeedbackListProps {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export function FeedbackList({ dateRange }: FeedbackListProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  useEffect(() => {
    fetchFeedback();
  }, [page, dateRange]);

  const fetchFeedback = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const credentials = sessionStorage.getItem('adminCredentials');
      if (!credentials) {
        setError('Admin credentials not found');
        setIsLoading(false);
        return;
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      
      if (dateRange?.startDate) queryParams.append('startDate', dateRange.startDate);
      if (dateRange?.endDate) queryParams.append('endDate', dateRange.endDate);

      const response = await fetch(`/api/admin/feedback?${queryParams}`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedback');
      }

      const data = await response.json();
      setFeedback(data.feedback);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      setError('Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b pb-4">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Total Feedback</h3>
            <p className="text-3xl font-bold text-indigo-600">{stats.totalCount}</p>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Average Rating</h3>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-indigo-600">
                {stats.averageRating.toFixed(1)}
              </p>
              {renderStars(Math.round(stats.averageRating))}
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Rating Distribution</h3>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution.find(r => r.rating === rating)?.count || 0;
                const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="flex gap-1 w-12">
                      {renderStars(rating)}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Recent Feedback
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {feedback.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No feedback found
            </div>
          ) : (
            feedback.map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {item.user?.name || item.user?.username || item.email || 'Anonymous'}
                      </p>
                      {item.user?.email && item.email && item.user.email !== item.email && (
                        <p className="text-sm text-gray-500">{item.email}</p>
                      )}
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  {item.rating && (
                    <div className="flex items-center gap-1">
                      {renderStars(item.rating)}
                      <span className="text-sm text-gray-600 ml-1">({item.rating}/5)</span>
                    </div>
                  )}
                </div>
                
                <div className="text-gray-700 whitespace-pre-wrap">
                  {item.message}
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} results
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={!pagination.hasPrev}
                  className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasNext}
                  className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
