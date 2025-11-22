import React, { useEffect, useMemo, useState } from 'react';

const initialIdentity = { did: '', root_cid: '', ipfs_url: '', label: '' };

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

function App() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [identities, setIdentities] = useState([]);
  const [form, setForm] = useState(initialIdentity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rootConfig, setRootConfig] = useState(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem('cfe_token');
    const storedUser = window.localStorage.getItem('cfe_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    fetch('/.well-known/cfe-root')
      .then((res) => res.json())
      .then((data) => setRootConfig(data))
      .catch(() => setRootConfig(null));
  }, []);

  useEffect(() => {
    if (token) {
      fetchIdentities();
    }
  }, [token]);

  const authHeader = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const fetchIdentities = async () => {
    try {
      const data = await apiRequest('/cfe/identities/me', { headers: authHeader });
      setUser(data.user);
      setIdentities(data.identities);
      window.localStorage.setItem('cfe_token', token);
      window.localStorage.setItem('cfe_user', JSON.stringify(data.user));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      setToken(data.token);
      window.localStorage.setItem('cfe_token', data.token);
      window.localStorage.setItem('cfe_user', JSON.stringify(data.user));
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIdentity = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await apiRequest('/cfe/identities', {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(form),
      });
      setForm(initialIdentity);
      await fetchIdentities();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setIdentities([]);
    window.localStorage.removeItem('cfe_token');
    window.localStorage.removeItem('cfe_user');
  };

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>CFE Identity &amp; Connect</h1>
          <p className="subtitle">Self-hosted identity registry with Canonical Funnel root access.</p>
        </div>
        {rootConfig ? (
          <div className="pill">
            Master DID: <strong>{rootConfig.master_did}</strong>
          </div>
        ) : null}
      </header>

      {error ? <div className="alert">{error}</div> : null}

      {!user ? (
        <div className="card">
          <div className="tab-row">
            <button
              type="button"
              className={mode === 'login' ? 'tab active' : 'tab'}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'tab active' : 'tab'}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>
          <form onSubmit={handleAuth} className="form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : mode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid">
          <div className="card">
            <div className="card-header">
              <div>
                <h2>Welcome, {user.email}</h2>
                <p className="muted">Manage your AI identities and mappings.</p>
              </div>
              <button className="secondary" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
            <form onSubmit={handleCreateIdentity} className="form">
              <label>
                DID
                <input
                  type="text"
                  value={form.did}
                  onChange={(e) => setForm({ ...form, did: e.target.value })}
                  required
                  placeholder="did:key:..."
                />
              </label>
              <label>
                Root CID
                <input
                  type="text"
                  value={form.root_cid}
                  onChange={(e) => setForm({ ...form, root_cid: e.target.value })}
                  required
                  placeholder="bafy..."
                />
              </label>
              <label>
                IPFS URL
                <input
                  type="url"
                  value={form.ipfs_url}
                  onChange={(e) => setForm({ ...form, ipfs_url: e.target.value })}
                  required
                  placeholder="https://gateway/ipfs/..."
                />
              </label>
              <label>
                Label (optional)
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Sandbox agent"
                />
              </label>
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Add Identity'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3>Your CFE Identities</h3>
            {identities.length === 0 ? (
              <p className="muted">No identities yet. Create one to get started.</p>
            ) : (
              <ul className="identity-list">
                {identities.map((identity) => (
                  <li key={identity.id} className="identity-item">
                    <div className="identity-meta">
                      <div className="label-row">
                        <span className="label-pill">{identity.label || 'Untitled'}</span>
                        <span className="timestamp">
                          {new Date(identity.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="field">
                        <span className="field-name">DID</span>
                        <code>{identity.did}</code>
                      </div>
                      <div className="field">
                        <span className="field-name">Root CID</span>
                        <code>{identity.root_cid}</code>
                      </div>
                      <div className="field">
                        <span className="field-name">IPFS URL</span>
                        <a href={identity.ipfs_url} target="_blank" rel="noreferrer">
                          {identity.ipfs_url}
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
