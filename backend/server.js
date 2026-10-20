
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Demonstration data: simulated resources stored in memory
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
let requests = [];
let events = [];
let requestCounter = 0;
let eventCounter = 0;

// Add an activity to the timeline
function addEvent(icon, message) {
  eventCounter += 1;
  events.push({
    id: eventCounter,
    icon,
    message,
    time: new Date().toISOString(),
  });
}

// Smart matching: select the nearest available resource of the requested type
function findBestMatch(type) {
  const candidates = resources
    .filter((r) => r.type === type && r.status === "AVAILABLE")
    .sort((a, b) => a.distance - b.distance);

  return candidates.length > 0 ? { ...candidates[0] } : null;
}

// Refresh matches for requests that have not yet been assigned
function refreshMatches() {
  requests.forEach((request) => {
    if (request.status === "SEARCHING") {
      request.match = findBestMatch(request.resourceType);
    }
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ONLINE",
    service: "Cloud Emergency Resource Hub",
    time: new Date().toISOString(),
  });
});

// Get all resources
app.get("/api/resources", (req, res) => {
  res.json(resources);
});

// Get all requests, newest first
app.get("/api/requests", (req, res) => {
  refreshMatches();
  res.json(requests);
});

// Get activity timeline
app.get("/api/events", (req, res) => {
  res.json(events);
});

// Create an emergency resource request
app.post("/api/requests", (req, res) => {
  const { resourceType, location, priority } = req.body;

  if (!resourceType || !location || !priority) {
    return res.status(400).json({
      error: "resourceType, location and priority are required",
    });
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
    addEvent(
      "\u{1F9E0}",
      `Smart match found: ${match.name} (${match.distance} km)`
    );
  } else {
    addEvent("\u{26A0}", `No available ${resourceType} found`);
  }

  res.status(201).json(newRequest);
});

// Assign a matched resource to an emergency request
app.post("/api/assign", (req, res) => {
  const { requestId, resourceId } = req.body;

  const request = requests.find((r) => r.id === requestId);

  if (!request) {
    return res.status(404).json({ error: "Request not found" });
  }

  if (request.status !== "SEARCHING") {
    return res.status(400).json({ error: "Request is already assigned" });
  }

  const resource = resources.find((r) => r.id === resourceId);

  if (!resource) {
    return res.status(404).json({ error: "Resource not found" });
  }

  if (resource.status !== "AVAILABLE") {
    return res.status(409).json({
      error: "Resource is no longer available",
    });
  }

  resource.status = "EN ROUTE";
  request.status = "ASSIGNED";
  request.assignedResource = { ...resource };
  request.match = null;

  addEvent("\u{2713}", `${resource.name} assigned to ${request.location}`);
  addEvent("\u{1F691}", `${resource.name} marked EN ROUTE`);

  res.json({ request, resource });
});

// Reset the demo to its original state
app.post("/api/reset", (req, res) => {
  resources = JSON.parse(JSON.stringify(initialResources));
  requests = [];
  events = [];
  requestCounter = 0;
  eventCounter = 0;

  res.json({ message: "Demo data reset" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
