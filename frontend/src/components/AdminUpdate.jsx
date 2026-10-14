import { useEffect, useState } from 'react';
import axiosClient from '../utils/axiosClient';
import { NavLink } from 'react-router';

const AdminUpdate = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [editingProblem, setEditingProblem] = useState(null);

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
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (problemSummary) => {
    try {
      setLoading(true);
      const { data } = await axiosClient.get(`/problem/problemById/${problemSummary._id}`);
      setEditingProblem(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch problem details: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingProblem) return;

    try {
      setError(null);
      setSuccessMsg(null);
      await axiosClient.put(`/problem/update/${editingProblem._id}`, editingProblem);
      setSuccessMsg('Problem updated successfully!');
      setEditingProblem(null);
      fetchProblems();
    } catch (err) {
      setError('Failed to update problem: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading && !editingProblem) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Update Problems</h1>
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

      {/* Editing Modal / Form */}
      {editingProblem ? (
        <div className="card bg-base-100 shadow-xl p-6 mb-8 border border-base-300">
          <h2 className="text-2xl font-bold mb-4">Edit Problem: {editingProblem.title}</h2>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Title</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={editingProblem.title || ''}
                onChange={(e) => setEditingProblem({ ...editingProblem, title: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Description</span>
              </label>
              <textarea
                className="textarea textarea-bordered h-32 w-full font-mono text-sm"
                value={editingProblem.description || ''}
                onChange={(e) => setEditingProblem({ ...editingProblem, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Difficulty</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={editingProblem.difficulty}
                  onChange={(e) => setEditingProblem({ ...editingProblem, difficulty: e.target.value })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Tag</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={editingProblem.tags}
                  onChange={(e) => setEditingProblem({ ...editingProblem, tags: e.target.value })}
                >
                  <option value="array">Array</option>
                  <option value="linkedList">Linked List</option>
                  <option value="graph">Graph</option>
                  <option value="dp">DP</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditingProblem(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Problems Table */}
      {problems.length === 0 ? (
        <div className="alert alert-info">
          <span>No problems found.</span>
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
                    <button
                      onClick={() => handleEditClick(problem)}
                      className="btn btn-sm btn-warning"
                    >
                      Edit Problem
                    </button>
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

export default AdminUpdate;
