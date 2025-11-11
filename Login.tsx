import { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const domainOK = true; // TEMP: allow any email while testing
  async function login() {
    setError("");
    try {
      if (!domainOK) return setError("Please use your school email.");
      await signInWithEmailAndPassword(auth, email, pw);
      window.location.href = "/";
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function register() {
    setError("");
    try {
      if (!domainOK) return setError("Please use your school email.");
      await createUserWithEmailAndPassword(auth, email, pw);
      window.location.href = "/";
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: 320, padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2>AlgebraMon Login</h2>
        <input
          placeholder="NYC student email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginTop: 10, padding: 8 }}
        />
        <input
          placeholder="Password"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{ width: "100%", marginTop: 10, padding: 8 }}
        />
        {error && <p style={{ color: "red", marginTop: 8, fontSize: 12 }}>{error}</p>}
        <button onClick={login} style={{ width: "100%", marginTop: 12, padding: 10, background: "black", color: "white" }}>
          Login
        </button>
        <button onClick={register} style={{ width: "100%", marginTop: 8, padding: 10, background: "#444", color: "white" }}>
          Register
        </button>
        <p style={{ fontSize: 12, marginTop: 8 }}>Use @nycstudents.net or @schools.nyc.gov</p>
      </div>
    </div>
  );
}
