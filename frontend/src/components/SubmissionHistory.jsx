import { useState, useEffect } from 'react';
import axiosClient from '../utils/axiosClient';

const SubmissionHistory = ({ problemId }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        const response = await axiosClient.get(`/problem/submittedProblem/${problemId}`);
        // Ensure submissions is always an array
        setSubmissions(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        setError('Failed to fetch submission history');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (problemId) {
      fetchSubmissions();
    }
  }, [problemId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return 'badge-success';
      case 'wrong': return 'badge-error';
      case 'error': return 'badge-warning';
      case 'pending': return 'badge-info';
      default: return 'badge-neutral';
    }
  };

  const formatMemory = (memory) => {
    if (!memory || isNaN(memory)) return '0 kB';
    if (memory < 1024) return `${memory} kB`;
    return `${(memory / 1024).toFixed(2)} MB`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-lg my-4">
        <div>
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-2">
      <h2 className="text-xl font-bold mb-4">Submission History</h2>
      
      {submissions.length === 0 ? (
        <div className="alert alert-info shadow-sm">
          <span>No submissions found for this problem yet. Write your code and click Submit!</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-xs">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Runtime</th>
                  <th>Memory</th>
                  <th>Passed</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, index) => (
                  <tr key={sub._id || index}>
                    <td>{index + 1}</td>
                    <td className="font-mono font-semibold">{sub.language}</td>
                    <td>
                      <span className={`badge badge-sm ${getStatusColor(sub.status)}`}>
                        {sub.status ? sub.status.toUpperCase() : 'UNKNOWN'}
                      </span>
                    </td>
                    
                    <td className="font-mono">{sub.runtime || 0}s</td>
                    <td className="font-mono">{formatMemory(sub.memory)}</td>
                    <td className="font-mono">{sub.testCasesPassed || 0}/{sub.testCasesTotal || 0}</td>
                    <td className="text-xs">{formatDate(sub.createdAt)}</td>
                    <td>
                      <button 
                        className="btn btn-xs btn-outline"
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        View Code
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Total submissions: {submissions.length}
          </p>
        </>
      )}

      {/* Code View Modal */}
      {selectedSubmission && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl">
            <h3 className="font-bold text-lg mb-3">
              Submission: {selectedSubmission.language}
            </h3>
            
            <div className="mb-4 flex flex-wrap gap-2 items-center">
              <span className={`badge ${getStatusColor(selectedSubmission.status)}`}>
                {selectedSubmission.status?.toUpperCase()}
              </span>
              <span className="badge badge-outline">
                Runtime: {selectedSubmission.runtime || 0}s
              </span>
              <span className="badge badge-outline">
                Memory: {formatMemory(selectedSubmission.memory)}
              </span>
              <span className="badge badge-outline">
                Passed: {selectedSubmission.testCasesPassed || 0}/{selectedSubmission.testCasesTotal || 0}
              </span>
            </div>

            {selectedSubmission.errorMessage && (
              <div className="alert alert-error mb-4 text-xs font-mono whitespace-pre-wrap">
                <span>{selectedSubmission.errorMessage}</span>
              </div>
            )}
            
            <pre className="p-4 bg-base-300 text-base-content rounded-lg overflow-x-auto text-xs font-mono">
              <code>{selectedSubmission.code}</code>
            </pre>
            
            <div className="modal-action">
              <button 
                className="btn btn-sm"
                onClick={() => setSelectedSubmission(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionHistory;