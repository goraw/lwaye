import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import type { Category, Listing, Report, User } from "@lwaylway/shared";
import "./styles.css";

type AdminDashboard = {
  users: User[];
  categories: Category[];
  listings: Listing[];
  reports: Report[];
};

type VerifyOtpPayload = { user: User; session: { sessionToken: string; expiresAt: string } };
type StartOtpPayload = { phone: string; code: string; expiresAt: string };

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";
const DEFAULT_ADMIN_PHONE = "+251900000001";
const DEFAULT_ADMIN_NAME = "LwayLway Admin";

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
  return payload?.message ?? `Request failed: ${response.status}`;
}

async function apiGet<T>(path: string, sessionToken?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body?: unknown, sessionToken?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function apiPatch<T>(path: string, body: unknown, sessionToken: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json() as Promise<T>;
}

function App() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [phone, setPhone] = useState(DEFAULT_ADMIN_PHONE);
  const [displayName, setDisplayName] = useState(DEFAULT_ADMIN_NAME);
  const [otpCode, setOtpCode] = useState("");
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadDashboard(activeSessionToken = sessionToken ?? undefined) {
    if (!activeSessionToken) return;
    setIsLoading(true);
    try {
      const [me, nextDashboard] = await Promise.all([
        apiGet<{ user: User }>("/v1/auth/me", activeSessionToken),
        apiGet<AdminDashboard>("/v1/admin/dashboard", activeSessionToken)
      ]);
      if (!me.user.isAdmin) {
        throw new Error("This account is not an admin.");
      }
      setAdminUser(me.user);
      setDashboard(nextDashboard);
      setError(null);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (sessionToken) {
      void loadDashboard(sessionToken);
    }
  }, [sessionToken]);

  async function handleStartOtp() {
    setIsAuthSubmitting(true);
    try {
      const payload = await apiPost<StartOtpPayload>("/v1/auth/start-otp", { phone });
      setDemoCodeHint(payload.code || null);
      setOtpCode(payload.code || "");
      setError(null);
    } catch (authError) {
      setError((authError as Error).message);
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    setIsAuthSubmitting(true);
    try {
      const payload = await apiPost<VerifyOtpPayload>("/v1/auth/verify-otp", { phone, code: otpCode, preferredLanguage: "en", displayName });
      if (!payload.user.isAdmin) {
        throw new Error("This account is not an admin.");
      }
      setSessionToken(payload.session.sessionToken);
      setAdminUser(payload.user);
      setDemoCodeHint(null);
      setError(null);
    } catch (authError) {
      setError((authError as Error).message);
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      if (sessionToken) await apiPost<void>("/v1/auth/logout", undefined, sessionToken);
    } catch {
    }
    setSessionToken(null);
    setAdminUser(null);
    setDashboard(null);
    setOtpCode("");
    setDemoCodeHint(null);
    setError(null);
  }

  async function updateListingStatus(listingId: string, status: Listing["status"]) {
    if (!sessionToken) return;
    setBusyKey(`listing:${listingId}`);
    try {
      await apiPatch(`/v1/listings/${listingId}/status`, { status }, sessionToken);
      await loadDashboard(sessionToken);
    } catch (updateError) {
      setError((updateError as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function resolveReport(reportId: string) {
    if (!sessionToken) return;
    setBusyKey(`report:${reportId}`);
    try {
      await apiPatch(`/v1/admin/reports/${reportId}/resolve`, {}, sessionToken);
      await loadDashboard(sessionToken);
    } catch (updateError) {
      setError((updateError as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  const listings = dashboard?.listings ?? [];
  const reports = dashboard?.reports ?? [];
  const users = dashboard?.users ?? [];
  const categories = dashboard?.categories ?? [];

  if (!sessionToken || !adminUser) {
    return (
      <div className="page">
        <aside className="sidebar">
          <div>
            <p className="eyebrow">LwayLway</p>
            <h1>Admin Console</h1>
            <p className="muted">Sign in with the seeded admin account to access moderation tools.</p>
            <p className="muted">API: {API_BASE_URL}</p>
            <p className="muted">Demo admin phone: {DEFAULT_ADMIN_PHONE}</p>
          </div>
        </aside>
        <main className="content">
          <section className="panel">
            <div className="panelHeader">
              <h2>Admin sign in</h2>
            </div>
            <div className="queueItem" style={{ display: "block" }}>
              <p className="muted">Request an OTP first. In local demo mode the code is shown below.</p>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone" />
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" />
              <input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} placeholder="OTP code" />
              {demoCodeHint ? <p className="muted">Demo OTP: {demoCodeHint}</p> : null}
              {error ? <p className="muted">{error}</p> : null}
              <div className="actions">
                <button className="approve" disabled={isAuthSubmitting} onClick={() => void handleStartOtp()}>{isAuthSubmitting ? "..." : "Send code"}</button>
                <button className="resolve" disabled={isAuthSubmitting} onClick={() => void handleVerifyOtp()}>Sign in</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">LwayLway</p>
          <h1>Admin Console</h1>
          <p className="muted">Moderate listings, triage abuse, and manage Addis Ababa launch taxonomy.</p>
          <p className="muted">Signed in as {adminUser.displayName}</p>
          <p className="muted">API: {API_BASE_URL}</p>
        </div>
        <div className="stats">
          <div className="statCard"><span>Listings</span><strong>{listings.length}</strong></div>
          <div className="statCard"><span>Open reports</span><strong>{reports.filter((report) => report.status !== "resolved" && report.status !== "dismissed").length}</strong></div>
          <div className="statCard"><span>Verified users</span><strong>{users.filter((user) => user.isPhoneVerified).length}</strong></div>
        </div>
        <button onClick={() => void handleLogout()}>Log out</button>
      </aside>

      <main className="content">
        {error ? <section className="panel"><div className="panelHeader"><h2>Connection issue</h2><button onClick={() => void loadDashboard()}>Retry</button></div><p className="muted">{error}</p></section> : null}

        <section className="panel">
          <div className="panelHeader"><h2>Review queue</h2><button onClick={() => void loadDashboard()}>{isLoading ? "Loading..." : "Refresh"}</button></div>
          {listings.map((listing) => (
            <article key={listing.id} className="queueItem">
              <div>
                <h3>{listing.title}</h3>
                <p>ETB {listing.priceETB.toLocaleString()} / {listing.status}</p>
              </div>
              <div className="actions">
                <button className="approve" disabled={busyKey === `listing:${listing.id}`} onClick={() => void updateListingStatus(listing.id, "active")}>Approve</button>
                <button className="hide" disabled={busyKey === `listing:${listing.id}`} onClick={() => void updateListingStatus(listing.id, "hidden")}>Hide</button>
              </div>
            </article>
          ))}
          {!isLoading && listings.length === 0 ? <p className="muted">No listings returned by the API.</p> : null}
        </section>

        <section className="grid">
          <section className="panel">
            <div className="panelHeader"><h2>Safety incidents</h2><button onClick={() => void loadDashboard()}>Refresh</button></div>
            {reports.length === 0 ? <p className="muted">No active reports in the database.</p> : reports.map((report) => (
              <article key={report.id} className="queueItem">
                <div>
                  <h3>{report.reasonCode}</h3>
                  <p>{report.targetType} / {report.status}</p>
                </div>
                <button className="resolve" disabled={busyKey === `report:${report.id}`} onClick={() => void resolveReport(report.id)}>Resolve</button>
              </article>
            ))}
          </section>

          <section className="panel">
            <div className="panelHeader"><h2>Market taxonomy</h2><button onClick={() => void loadDashboard()}>Refresh</button></div>
            <ul className="categoryList">
              {categories.map((category) => (
                <li key={category.id}>
                  <span>{category.label.en}</span>
                  <small className="amharicText" lang="am">{category.label.am}</small>
                </li>
              ))}
            </ul>
            {!isLoading && categories.length === 0 ? <p className="muted">No categories returned by the API.</p> : null}
          </section>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

