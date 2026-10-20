import { useState } from "react";

export default function UploadReport() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleUpload() {
    if (!file) {
      setIsError(true);
      setMessage("Please choose a file first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/incident-report", { method: "POST", body: data });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setIsError(false);
      setMessage("\u{2601} Incident report securely stored in cloud: " + json.key);
    } catch (err) {
      setIsError(true);
      setMessage(err.message || "Upload failed");
    }
    setBusy(false);
  }

  return (
    <section className="card">
      <h2>{"\u{2601}"} Upload Incident Report</h2>
      <p className="muted">Attach an accident photo or report. Stored in Amazon S3.</p>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
        style={{ color: "#e2e8f0", marginTop: 10 }}
      />
      <button className="btn-success" onClick={handleUpload} disabled={busy}>
        {busy ? "Uploading..." : "UPLOAD TO CLOUD"}
      </button>
      {message && (
        <div className={isError ? "error-box" : "match-result assigned"} style={{ marginTop: 14 }}>
          {message}
        </div>
      )}
    </section>
  );
}