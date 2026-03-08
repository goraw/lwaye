import React from "react";
import ReactDOM from "react-dom/client";
import { categories, listings, reports, users } from "@lwaye/shared";
import "./styles.css";

function App() {
  return (
    <div className="page">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Lwaye</p>
          <h1>Admin Console</h1>
          <p className="muted">Moderate listings, triage abuse, and manage Addis Ababa launch taxonomy.</p>
        </div>
        <div className="stats">
          <div className="statCard">
            <span>Active listings</span>
            <strong>{listings.length}</strong>
          </div>
          <div className="statCard">
            <span>Open reports</span>
            <strong>{reports.length}</strong>
          </div>
          <div className="statCard">
            <span>Verified users</span>
            <strong>{users.filter((user) => user.isPhoneVerified).length}</strong>
          </div>
        </div>
      </aside>

      <main className="content">
        <section className="panel">
          <div className="panelHeader">
            <h2>Review queue</h2>
            <button>Refresh</button>
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
                <button className="approve">Approve</button>
                <button className="hide">Hide</button>
              </div>
            </article>
          ))}
        </section>

        <section className="grid">
          <section className="panel">
            <div className="panelHeader">
              <h2>Safety incidents</h2>
              <button>Escalate</button>
            </div>
            {reports.length === 0 ? (
              <p className="muted">No active reports in the seed dataset.</p>
            ) : (
              reports.map((report) => (
                <article key={report.id} className="queueItem">
                  <div>
                    <h3>{report.reasonCode}</h3>
                    <p>{report.targetType}</p>
                  </div>
                  <button className="resolve">Resolve</button>
                </article>
              ))
            )}
          </section>

          <section className="panel">
            <div className="panelHeader">
              <h2>Market taxonomy</h2>
              <button>Add category</button>
            </div>
            <ul className="categoryList">
              {categories.map((category) => (
                <li key={category.id}>
                  <span>{category.label.en}</span>
                  <small>{category.label.am}</small>
                </li>
              ))}
            </ul>
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
