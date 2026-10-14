import { useEffect, useState } from 'react';
import axiosClient from '../utils/axiosClient';
import { NavLink } from 'react-router';

const AdminVideo = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const { data } = await axiosClient.get('/problem/getAllProblem');
      setProblems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch problems: ' + (err.response?.data?.message || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the video solution for "${title}"?`)) return;

    try {
      setError(null);
      setSuccessMsg(null);
      const response = await axiosClient.delete(`/video/delete/${id}`);
      setSuccessMsg(response.data?.message || 'Video deleted successfully');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to delete video';
      setError(msg);
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Video Management</h1>
        <NavLink to="/admin" className="btn btn-outline btn-sm">Back to Admin</NavLink>
      </div>

      {successMsg && (
        <div className="alert alert-success shadow-lg mb-4">
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error shadow-lg mb-4">
          <span>{error}</span>
        </div>
      )}

      {problems.length === 0 ? (
        <div className="alert alert-info">
          <span>No problems found. Please create a problem first.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="w-1/12">#</th>
                <th className="w-5/12">Title</th>
                <th className="w-2/12">Difficulty</th>
                <th className="w-2/12">Tags</th>
                <th className="w-2/12">Actions</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem, index) => (
                <tr key={problem._id}>
                  <th>{index + 1}</th>
                  <td className="font-semibold">{problem.title}</td>
                  <td>
                    <span className={`badge ${
                      problem.difficulty?.toLowerCase() === 'easy' 
                        ? 'badge-success' 
                        : problem.difficulty?.toLowerCase() === 'medium' 
                          ? 'badge-warning' 
                          : 'badge-error'
                    }`}>
                      {problem.difficulty}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-outline">
                      {problem.tags}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <NavLink 
                        to={`/admin/upload/${problem._id}`}
                        className="btn btn-sm btn-primary"
                      >
                        Upload Video
                      </NavLink>
                      <button 
                        onClick={() => handleDeleteVideo(problem._id, problem.title)}
                        className="btn btn-sm btn-error btn-outline"
                      >
                        Delete Video
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminVideo;