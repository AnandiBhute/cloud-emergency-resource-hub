
import { useEffect, useState } from "react";
import "./App.css";
import UploadReport from "./UploadReport.jsx";
const API = "/api";

const E = {
  siren: "\u{1F6A8}",
  green: "\u{1F7E2}",
  red: "\u{1F534}",
  orange: "\u{1F7E0}",
  blue: "\u{1F535}",
  brain: "\u{1F9E0}",
  pin: "\u{1F4CD}",
  clock: "\u{1F552}",
  check: "\u{2713}",
  done: "\u{2705}",
  warn: "\u{26A0}",
};

const ICONS = {
  Ambulance: "\u{1F691}",
  Hospital: "\u{1F3E5}",
  "Blood Unit": "\u{1FA78}",
  "Emergency Kit": "\u{1F9F0}",
};

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status) {
  if (status === "AVAILABLE") return "badge badge-green";
  if (status === "EN ROUTE") return "badge badge-blue";
  return "badge badge-amber";
}

function statusIcon(status) {
  if (status === "AVAILABLE") return E.green;
  if (status === "EN ROUTE") return ICONS.Ambulance;
  return E.orange;
}

function priorityIcon(priority) {
  if (priority === "CRITICAL") return E.red;
  if (priority === "HIGH") return E.orange;
  return E.blue;
}

export default function App() {
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    resourceType: "Ambulance",
    location: "Zone A",
    priority: "CRITICAL",
  });

  async function loadAll() {
    try {
      const [r, q, e] = await Promise.all([
        fetch(`${API}/resources`).then((x) => x.json()),
        fetch(`${API}/requests`).then((x) => x.json()),
        fetch(`${API}/events`).then((x) => x.json()),
      ]);

      setResources(r);
      setRequests(q);
      setEvents(e);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }

  useEffect(() => {
    loadAll();

    const timer = setInterval(loadAll, 3000);
    return () => clearInterval(timer);
  }, []);

  async function handleRequest() {
    setError("");

    try {
      const res = await fetch(`${API}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Request failed");
      }

      await loadAll();
    } catch (err) {
      setError(err.message || "Could not create request");
    }
  }

  async function handleAssign(request) {
    setError("");

    try {
      const res = await fetch(`${API}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          resourceId: request.match.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Assignment failed");
      }

      await loadAll();
    } catch (err) {
      setError(err.message || "Could not assign resource");
    }
  }

  async function handleReset() {
    setError("");

    try {
      const res = await fetch(`${API}/reset`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Could not reset demo");
      }

      await loadAll();
    } catch (err) {
      setError(err.message || "Could not reset demo");
    }
  }

  const current = requests[0];
  const activeEmergencies = requests.length;

  const availableCount = resources.filter(
    (r) => r.status === "AVAILABLE"
  ).length;

  const hospitalCount = resources.filter(
    (r) => r.type === "Hospital" && r.status === "AVAILABLE"
  ).length;

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>{E.siren} Cloud Emergency Resource Hub</h1>
          <p className="subtitle">
            Real-Time Cloud-Based Emergency Resource Coordination
          </p>
        </div>

        <div className="header-right">
          <span className={online ? "badge badge-green" : "badge badge-red"}>
            {online ? `${E.green} CLOUD ONLINE` : `${E.red} OFFLINE`}
          </span>

          <button className="btn-ghost" onClick={handleReset}>
            Reset Demo
          </button>
        </div>
      </header>

      <section className="kpis">
        <div className="card kpi">
          <span className="kpi-label">
            {E.siren} Active Emergencies
          </span>
          <span className="kpi-value red">{activeEmergencies}</span>
        </div>

        <div className="card kpi">
          <span className="kpi-label">
            {ICONS.Ambulance} Available Resources
          </span>
          <span className="kpi-value green">{availableCount}</span>
        </div>

        <div className="card kpi">
          <span className="kpi-label">
            {ICONS.Hospital} Hospitals Available
          </span>
          <span className="kpi-value blue">{hospitalCount}</span>
        </div>

        <div className="card kpi">
          <span className="kpi-label">
            {E.green} System Status
          </span>
          <span
            className={
              online
                ? "kpi-value green small"
                : "kpi-value red small"
            }
          >
            {online ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </section>

      {error && (
        <div className="error-box">
          {E.warn} {error}
        </div>
      )}

      <section className="main-grid">
        <div className="card">
          <h2>{E.siren} Emergency Coordinator</h2>

          <label>Resource Type</label>
          <select
            value={form.resourceType}
            onChange={(e) =>
              setForm({ ...form, resourceType: e.target.value })
            }
          >
            <option>Ambulance</option>
            <option>Hospital</option>
            <option>Blood Unit</option>
            <option>Emergency Kit</option>
          </select>

          <label>Location</label>
          <select
            value={form.location}
            onChange={(e) =>
              setForm({ ...form, location: e.target.value })
            }
          >
            <option>Zone A</option>
            <option>Zone B</option>
            <option>Zone C</option>
          </select>

          <label>Priority</label>
          <select
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value })
            }
          >
            <option>CRITICAL</option>
            <option>HIGH</option>
            <option>MEDIUM</option>
          </select>

          <button className="btn-danger" onClick={handleRequest}>
            {E.siren} REQUEST RESOURCE
          </button>
        </div>

        <div className="card">
          <h2>{E.brain} Smart Resource Matching</h2>

          {!current && (
            <p className="muted">No active emergency request.</p>
          )}

          {current && (
            <div className="match-box">
              <div className="emergency-banner">
                <span className={`priority priority-${current.priority}`}>
                  {priorityIcon(current.priority)} {current.priority} EMERGENCY
                </span>

                <span
                  className={
                    current.status === "ASSIGNED"
                      ? "badge badge-green"
                      : "badge badge-amber"
                  }
                >
                  {current.status}
                </span>
              </div>

              <p className="req-line">
                {current.resourceType} required
                <br />
                <span className="muted">
                  {E.pin} Location: {current.location}
                </span>
              </p>

              {current.status === "SEARCHING" && current.match && (
                <>
                  <div className="match-result">
                    <div className="match-title">
                      {E.brain} SMART MATCH FOUND
                    </div>

                    <div className="match-name">
                      {ICONS[current.match.type]} {current.match.name}
                    </div>

                    <div className="muted">
                      Distance: {current.match.distance} km
                    </div>

                    <div className="badge badge-green">
                      {E.green} AVAILABLE
                    </div>

                    <p className="reason">
                      Reason: Nearest available{" "}
                      {current.resourceType.toLowerCase()} matching
                      the requested resource type.
                    </p>
                  </div>

                  <button
                    className="btn-success"
                    onClick={() => handleAssign(current)}
                  >
                    {E.check} ACCEPT &amp; ASSIGN
                  </button>
                </>
              )}

              {current.status === "SEARCHING" && !current.match && (
                <div className="match-result warn">
                  {E.warn} No available {current.resourceType} right now.
                </div>
              )}

              {current.status === "ASSIGNED" &&
                current.assignedResource && (
                  <div className="match-result assigned">
                    <div className="match-title">
                      {E.done} RESOURCE ASSIGNED
                    </div>

                    <div className="match-name">
                      {ICONS[current.assignedResource.type]}{" "}
                      {current.assignedResource.name}
                    </div>

                    <div className="muted">
                      {E.pin} {current.location}
                    </div>

                    <div className="badge badge-blue">
                      {E.green} EN ROUTE
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>{ICONS.Ambulance} Resource Status</h2>

        <div className="resource-grid">
          {resources.map((r) => (
            <div
              key={r.id}
              className={`resource-card ${
                r.status === "EN ROUTE" ? "highlight" : ""
              }`}
            >
              <div className="resource-top">
                <strong>
                  {ICONS[r.type]} {r.name}
                </strong>
              </div>

              <div className="muted">{r.location}</div>
              <div className="muted">{r.distance} km</div>

              <span className={statusClass(r.status)}>
                {statusIcon(r.status)} {r.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{E.clock} Activity Timeline</h2>

        {events.length === 0 && (
          <p className="muted">No activity yet.</p>
        )}

        <ul className="timeline">
          {events.map((ev) => (
            <li key={ev.id}>
              <span className="time">{formatTime(ev.time)}</span>
              <span>
                {ev.icon} {ev.message}
              </span>
            </li>
          ))}
        </ul>
      </section>
            <UploadReport />

      <footer className="footer">
        Prototype | Simulated emergency resources | Demonstration data only
      </footer>
    </div>
  );
}
