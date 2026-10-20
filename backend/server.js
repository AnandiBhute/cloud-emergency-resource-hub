const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ---------- DEMONSTRATION DATA (simulated, in-memory) ----------
function makeResource(id, name, type, location, distance, status) {
  return { id, name, type, location, distance, status };
}

const initialResources = [
  makeResource("A-01", "Ambulance A-01", "Ambulance", "Zone A", 2.1, "AVAILABLE"),
  makeResource("A-02", "Ambulance A-02", "Ambulance", "Zone B", 4.7, "AVAILABLE"),
  makeResource("A-03", "Ambulance A-03", "Ambulance", "Zone C", 7.2, "BUSY"),
  makeResource("H-01", "City Hospital", "Hospital", "Zone A", 3.5, "AVAILABLE"),
  makeResource("H-02", "Metro Care Hospital", "Hospital", "Zone C", 6.8, "AVAILABLE"),
  makeResource("B-01", "Blood Bank A", "Blood Unit", "Zone B", 5.2, "AVAILABLE"),
  makeResource("B-02", "Blood Bank B", "Blood Unit", "Zone C", 8.1, "AVAILABLE"),
  makeResource("K-01", "Emergency Kit K-01", "Emergency Kit", "Zone A", 1.8, "AVAILABLE"),
  makeResource("K-02", "Emergency Kit K-02", "Emergency Kit", "Zone B", 4.0, "AVAILABLE"),
];

let resources = JSON.parse(JSON.stringify(initialResources));
let requests = []; // newest first
let events = []; // oldest first
let requestCounter = 0;
let eventCounter = 0;

// ---------- HELPERS ----------
function addEvent(icon, message) {
  eventCounter += 1;
  events.push({
    id: eventCounter,
    icon,
    message,
    time: new Date().toISOString(),
  });
}

// Smart Resource Matching (rule-based, NOT AI):
// 1. filter by type  2. keep AVAILABLE only  3. sort by distance  4. pick nearest
function findBestMatch(type) {
  const candidates = resources
    .filter((r) => r.type === type && r.status === "AVAILABLE")
    .sort((a, b) => a.distance - b.distance);
  return candidates.length > 0 ? { ...candidates[0] } : null;
}

// Keep matches fresh for requests still searching
function refreshMatches() {
  requests.forEach((req) => {
    if (req.status === "SEARCHING") {
      req.match = findBestMatch(req.resourceType);
    }
  });
}

// ---------- ROUTES ----------
app.get("/api/health", (req, res) => {
  res.json({
    status: "ONLINE",
    service: "Cloud Emergency Resource Hub",
    time: new Date().toISOString(),
  });
});

app.get("/api/resources", (req, res) => {
  res.json(resources);
});

app.get("/api/requests", (req, res) => {
  refreshMatches();
  res.json(requests);
});

app.get("/api/events", (req, res) => {
  res.json(events);
});

app.post("/api/requests", (req, res) => {
  const { resourceType, location, priority } = req.body;

  if (!resourceType || !location || !priority) {
    return res
      .status(400)
      .json({ error: "resourceType, location and priority are required" });
  }

  requestCounter += 1;
  const match = findBestMatch(resourceType);

  const newRequest = {
    id: `REQ-${requestCounter}`,
    resourceType,
    location,
    priority,
    status: "SEARCHING",
    match,
    assignedResource: null,
    createdAt: new Date().toISOString(),
  };

  requests.unshift(newRequest);

  addEvent(
    "\u{1F6A8}",
    `Emergency request created: ${resourceType} needed in ${location} (${priority})`
  );
  if (match) {
    addEvent("\u{1F9E0}", `Smart match found: ${match.name} (${match.distance} km)`);
  } else {
    addEvent("\u{26A0}", `No available ${resourceType} found`);
  }

  res.status(201).json(newRequest);
});

app.post("/api/assign", (req, res) => {
  const { requestId, resourceId } = req.body;

  const request = requests.find((r) => r.id === requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });
  if (request.status !== "SEARCHING") {
    return res.status(400).json({ error: "Request is already assigned" });
  }

  const resource = resources.find((r) => r.id === resourceId);
  if (!resource) return res.status(404).json({ error: "Resource not found" });
  if (resource.status !== "AVAILABLE") {
    return res.status(409).json({ error: "Resource is no longer available" });
  }

  resource.status = "EN ROUTE";
  request.status = "ASSIGNED";
  request.assignedResource = { ...resource };
  request.match = null;

  addEvent("\u{2713}", `${resource.name} assigned to ${request.location}`);
  addEvent("\u{1F691}", `${resource.name} marked EN ROUTE`);

  res.json({ request, resource });
});

app.post("/api/reset", (req, res) => {
  resources = JSON.parse(JSON.stringify(initialResources));
  requests = [];
  events = [];
  requestCounter = 0;
  eventCounter = 0;
  res.json({ message: "Demo data reset" });
});

// ---------- S3 INCIDENT REPORT UPLOAD ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

const S3_BUCKET = process.env.S3_BUCKET;
const s3 = new S3Client({ region: process.env.AWS_REGION || "ap-south-1" });

app.post("/api/incident-report", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Please choose a file to upload" });
  }
  if (!S3_BUCKET) {
    return res.status(503).json({
      error: "S3 is not configured on this server (set S3_BUCKET). Local demo mode.",
    });
  }

  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `incident-reports/${Date.now()}-${safeName}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );
    addEvent("\u{2601}", `Incident report stored in Amazon S3: ${safeName}`);
    res.status(201).json({ message: "Stored in S3", key, bucket: S3_BUCKET });
  } catch (err) {
    console.error("S3 upload failed:", err.message);
    res.status(500).json({ error: "S3 upload failed: " + err.message });
  }
});

// ---------- SERVE BUILT FRONTEND (used on EC2 after "npm run build") ----------
app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"), (err) => {
    if (err) res.status(404).send("Frontend build not found. Run npm run build in frontend/.");
  });
});


app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});