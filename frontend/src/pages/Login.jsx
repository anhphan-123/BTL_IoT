import { useState } from "react";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onLogin({ username, password });
    } catch (loginError) {
      setError(loginError.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="logo login-logo">IoT Monitor</div>
        <h1>Đăng nhập</h1>
        <p className="login-subtitle">Đăng nhập để quản lý hệ thống IoT</p>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
          disabled={loading}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={loading}
        />

        {error && <p className="login-error" role="alert">{error}</p>}

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}

export default Login;
