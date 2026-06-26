"use client";

import { useState, useEffect } from "react";
import { loginClient, getClientSession } from "@/app/actions/clientAuth";
import { useRouter } from "next/navigation";
import { Lock, FileKey, User, Loader2 } from "lucide-react";

export default function ClientLoginPage() {
  const [formId, setFormId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  // If already has client session, redirect to dashboard /
  useEffect(() => {
    async function checkSession() {
      try {
        const session = await getClientSession();
        if (session) {
          router.push("/");
        } else {
          setCheckingSession(false);
        }
      } catch (err) {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await loginClient(formId, username, password);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Authentication failed.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      background: "var(--bg-main)",
      padding: "1.5rem"
    }}>
      <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: "2.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ 
            display: "inline-flex", 
            padding: "1.5rem", 
            backgroundColor: "var(--primary-light)", 
            borderRadius: "50%",
            marginBottom: "1rem"
          }}>
            <FileKey color="var(--primary)" size={36} />
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>Aero Form Builder</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>Client Data Portal</p>
        </div>

        {error && (
          <div style={{ backgroundColor: "var(--danger)", color: "white", padding: "0.75rem", borderRadius: "var(--radius-md)", marginBottom: "1.5rem", fontSize: "0.875rem", textAlign: "center", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Form ID (Leave blank if Super Admin)</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: "50%", left: "1rem", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>
                <FileKey size={18} />
              </div>
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: "2.75rem" }}
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="e.g. contact-form"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: "50%", left: "1rem", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>
                <User size={18} />
              </div>
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: "2.75rem" }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter client username"
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: "50%", left: "1rem", transform: "translateY(-50%)", color: "var(--text-secondary)" }}>
                <Lock size={18} />
              </div>
              <input 
                type="password" 
                className="form-input" 
                style={{ paddingLeft: "2.75rem" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: "100%", marginTop: "1rem", fontWeight: "bold" }}
            disabled={loading}
          >
            {loading ? <><Loader2 className="animate-spin" size={18}/> Verifying...</> : "Verify & Access"}
          </button>
        </form>

        <div style={{ marginTop: "2rem", fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center" }}>
          Developed by RemotizedIT
        </div>
      </div>
    </div>
  );
}
