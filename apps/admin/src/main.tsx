import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import type { Category, Listing, Report, User } from "@lwaye/shared";
import "./styles.css";

type AdminDashboard = {
  users: User[];
  categories: Category[];
  listings: Listing[];
  reports: Report[];
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new Error(payload?.message ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function App() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadDashboard() {
    setIsLoading(true);
    try {
      setDashboard(await apiGet<AdminDashboard>("/v1/admin/dashboard"));
      setError(null);
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function updateListingStatus(listingId: string, status: Listing["status"]) {
    setBusyKey(`listing:${listingId}`);
    try {
      await apiPatch(`/v1/listings/${listingId}/status`, { status });
      await loadDashboard();
    } catch (updateError) {
      setError((updateError as Error).message);
    } finally {
      setBusyKey(null);
    }
  }

  async function resolveReport(reportId: string) {
    setBusyKey(`report:${reportId}`);
    try {
      await apiPatch(`/v1/admin/reports/${reportId}/resolve`);
      await loadDashboard();
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

  return (
    <div className="page">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Lwaye</p>
          <h1>Admin Console</h1>
          <p className="muted">Moderate listings, triage abuse, and manage Addis Ababa launch taxonomy.</p>
          <p className="muted">API: {API_BASE_URL}</p>
        </div>
        <div className="stats">
          <div className="statCard">
            <span>Listings</span>
            <strong>{listings.length}</strong>
          </div>
          <div className="statCard">
            <span>Open reports</span>
            <strong>{reports.filter((report) => report.status !== "resolved" && report.status !== "dismissed").length}</strong>
          </div>
          <div className="statCard">
            <span>Verified users</span>
            <strong>{users.filter((user) => user.isPhoneVerified).length}</strong>
          </div>
        </div>
      </aside>

      <main className="content">
        {error ? (
          <section className="panel">
            <div className="panelHeader">
              <h2>Connection issue</h2>
              <button onClick={() => void loadDashboard()}>Retry</button>
            </div>
            <p className="muted">{error}</p>
          </section>
        ) : null}

        <section className="panel">
          <div className="panelHeader">
            <h2>Review queue</h2>
            <button onClick={() => void loadDashboard()}>{isLoading ? "Loading..." : "Refresh"}</button>
          </div>
          {listings.map((listing) => (
            <article key={listing.id} className="queueItem">
              <div>
                <h3>{listing.title}</h3>
                <p>
                  ETB {listing.priceETB.toLocaleString()} • {listing.status}
                </p>
              </div>
              <div className="actions">
                <button className="approve" disabled={busyKey === `listing:${listing.id}`} onClick={() => void updateListingStatus(listing.id, "active")}>
                  Approve
                </button>
                <button className="hide" disabled={busyKey === `listing:${listing.id}`} onClick={() => void updateListingStatus(listing.id, "hidden")}>
                  Hide
                </button>
              </div>
            </article>
          ))}
          {!isLoading && listings.length === 0 ? <p className="muted">No listings returned by the API.</p> : null}
        </section>

        <section className="grid">
          <section className="panel">
            <div className="panelHeader">
              <h2>Safety incidents</h2>
              <button onClick={() => void loadDashboard()}>Refresh</button>
            </div>
            {reports.length === 0 ? (
              <p className="muted">No active reports in the database.</p>
            ) : (
              reports.map((report) => (
                <article key={report.id} className="queueItem">
                  <div>
                    <h3>{report.reasonCode}</h3>
                    <p>
                      {report.targetType} • {report.status}
                    </p>
                  </div>
                  <button className="resolve" disabled={busyKey === `report:${report.id}`} onClick={() => void resolveReport(report.id)}>
                    Resolve
                  </button>
                </article>
              ))
            )}
          </section>

          <section className="panel">
            <div className="panelHeader">
              <h2>Market taxonomy</h2>
              <button onClick={() => void loadDashboard()}>Refresh</button>
            </div>
            <ul className="categoryList">
              {categories.map((category) => (
                <li key={category.id}>
                  <span>{category.label.en}</span>
                  <small>{category.label.am}</small>
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
