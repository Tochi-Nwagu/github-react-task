import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const FindUsers = () => {
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [userData, setUserData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 6;

  const navigate = useNavigate();
  // 🔍 Global user search as you type
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchInput.length < 2) {
        setSuggestions([]);

        return;
      }
      try {
        const res = await axios.get(
          `https://api.github.com/search/users?q=${searchInput}`
        );
        setSuggestions(res.data.items.slice(0, 15));
      } catch {
        setSuggestions([]);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 300); //  optional debounce

    return () => clearTimeout(debounce);
  }, [searchInput]);

  // 👤 Fetch user profile + repos
  const fetchUserData = async (username) => {
    setLoading(true);
    setError('');
    setUserData(null);
    setRepos([]);
    setSuggestions([]);
    setSearchInput('');

    try {
      const userRes = await axios.get(
        `https://api.github.com/users/${username}`
      );
      const repoRes = await axios.get(
        `https://api.github.com/users/${username}/repos`
      );

      const reposWithLang = await Promise.all(
        repoRes.data.map(async (repo) => {
          try {
            const langRes = await axios.get(
              `https://api.github.com/repos/${username}/${repo.name}/languages`
            );
            const languages = langRes.data;
            const topLang = Object.entries(languages).sort(
              (a, b) => b[1] - a[1]
            )[0]?.[0];
            return { ...repo, topLanguage: topLang || 'N/A' };
          } catch {
            return { ...repo, topLanguage: 'N/A' };
          }
        })
      );

      setUserData(userRes.data);
      setRepos(reposWithLang);
      setCurrentPage(1);
    } catch {
      setError('User not found or something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (username) => {
    navigate(`/profile/${username}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && suggestions.length === 1) {
      fetchUserData(suggestions[0].login);
    }
  };

  const mostStarredRepo = repos.reduce(
    (max, repo) =>
      repo.stargazers_count > (max?.stargazers_count || 0) ? repo : max,
    {}
  );

  const paginatedRepos = repos.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );
  const totalPages = Math.ceil(repos.length / perPage);

  return (
    <div className="container mt-4">
      {/* Universal Search Bar */}
      <div className="input-group mb-3 position-relative">
        <input
          type="text"
          className="form-control"
          placeholder="Search users"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Link to={`/profile/${suggestions[0]?.login}`}>
          <button
            className="btn btn-primary custom-purple-btn-override"
            onClick={() =>
              suggestions.length > 0 && fetchUserData(suggestions[0].login)
            }
          >
            Search
          </button>
        </Link>

        {/* 💡 Suggestions from global search */}
        {suggestions.length > 0 && (
          <ul
            className="list-group position-absolute w-100 shadow"
            style={{ zIndex: 2, top: '100%' }}
          >
            {suggestions.map((user) => (
              <li
                key={user.id}
                className="list-group-item d-flex align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => handleUserClick(user.login)}
              >
                <img
                  src={user.avatar_url}
                  alt="avatar"
                  className="rounded-circle me-2"
                  width={30}
                  height={30}
                />
                {user.login}
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <div className="alert alert-info">Loading...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {userData && (
        <div className="card mb-4 p-3">
          <img
            src={userData.avatar_url}
            alt="avatar"
            className="rounded-circle mb-2"
            width="100"
          />
          <h3>{userData.name || userData.login}</h3>
          <p>{userData.bio}</p>
          <p>
            Repos: {userData.public_repos} | Followers: {userData.followers}
          </p>
        </div>
      )}

      {paginatedRepos.length > 0 && (
        <div>
          <h4>Repositories</h4>
          {paginatedRepos.map((repo) => (
            <div
              key={repo.id}
              className={`card p-3 mb-2 ${
                repo.id === mostStarredRepo.id ? 'bg-warning-subtle' : ''
              }`}
            >
              <h5>
                {repo.name}{' '}
                {repo.id === mostStarredRepo.id && (
                  <span className="badge bg-warning">⭐ Most Starred</span>
                )}
              </h5>
              <p>{repo.description}</p>
              <span className="badge bg-secondary">{repo.topLanguage}</span>
              <br />
              <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </div>
          ))}

          <div className="d-flex justify-content-between align-items-center mt-3">
            <button
              className="btn btn-outline-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-outline-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindUsers;
