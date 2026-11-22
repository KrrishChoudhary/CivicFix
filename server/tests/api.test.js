// server/tests/api.test.js
// Automated Integration Test Suite using Jest, Supertest, and mongodb-memory-server
// Tests run against an isolated in-memory MongoDB instance and NEVER touch live Atlas data

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_super_secret_jwt_key_12345";

// Allow generous timeout for first-time in-memory MongoDB binary download and startup
jest.setTimeout(600000);

const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../server");
const User = require("../models/User");
const Issue = require("../models/Issue");
const StatusUpdate = require("../models/StatusUpdate");
const Upvote = require("../models/Upvote");

let mongoServer;

beforeAll(async () => {
  // Spin up an isolated in-memory MongoDB database
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Ensure 2dsphere index is created on the Issue collection
  await Issue.init();
}, 600000);

afterAll(async () => {
  // Disconnect mongoose and shut down in-memory MongoDB
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  // Clean all collections before each test for test isolation
  await User.deleteMany({});
  await Issue.deleteMany({});
  await StatusUpdate.deleteMany({});
  await Upvote.deleteMany({});
});

describe("CivicFix API Test Suite", () => {
  // Test 1: User Registration & Login
  test("1. Successfully registers and logs in a citizen user", async () => {
    // A. Register
    const registerRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Ravi Kumar",
        email: "ravi@example.com",
        password: "Password123!",
      });

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.token).toBeDefined();
    expect(registerRes.body.user).toBeDefined();
    expect(registerRes.body.user.name).toBe("Ravi Kumar");
    expect(registerRes.body.user.email).toBe("ravi@example.com");
    expect(registerRes.body.user.password).toBeUndefined(); // Never expose passwords

    // B. Login with correct password
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "ravi@example.com",
        password: "Password123!",
      });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.email).toBe("ravi@example.com");

    // C. Login with incorrect password returns 401
    const badLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "ravi@example.com",
        password: "WrongPassword!",
      });

    expect(badLoginRes.statusCode).toBe(401);
    expect(badLoginRes.body.message).toMatch(/invalid email or password/i);
  });

  // Test 2: Role Elevation Prevention
  test("2. Client cannot escalate role to admin during registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Hacker Citizen",
        email: "hacker@example.com",
        password: "Password123!",
        role: "admin", // Malicious attempt to self-assign admin role
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe("citizen"); // Must remain citizen

    // Verify database record directly
    const userInDb = await User.findOne({ email: "hacker@example.com" });
    expect(userInDb.role).toBe("citizen");
  });

  // Test 3: Protected Route Authentication Guard
  test("3. Protect middleware rejects requests with missing or invalid tokens", async () => {
    // Missing token
    const noTokenRes = await request(app).get("/api/issues/mine");
    expect(noTokenRes.statusCode).toBe(401);
    expect(noTokenRes.body.message).toMatch(/not authorized, no token provided/i);

    // Invalid token
    const badTokenRes = await request(app)
      .get("/api/issues/mine")
      .set("Authorization", "Bearer invalid.fake.token");
    expect(badTokenRes.statusCode).toBe(401);
    expect(badTokenRes.body.message).toMatch(/token invalid or expired/i);
  });

  // Test 4: Role Authorization (Citizen cannot advance issue status)
  test("4. Citizens receive 403 Forbidden when attempting to update issue status", async () => {
    // Create citizen user
    const citizen = await User.create({
      name: "Normal Citizen",
      email: "citizen@example.com",
      password: "HashedPassword123",
      role: "citizen",
    });

    const citizenToken = jwtSign(citizen._id, "citizen");

    // Create an issue
    const issue = await Issue.create({
      title: "Pothole on 100ft road",
      description: "Severe pothole near junction",
      category: "pothole",
      location: { type: "Point", coordinates: [77.6408, 12.9784] },
      status: "reported",
      reportedBy: citizen._id,
    });

    // Attempt status update as citizen
    const res = await request(app)
      .patch(`/api/issues/${issue._id}/status`)
      .set("Authorization", `Bearer ${citizenToken}`)
      .send({
        status: "verified",
        remark: "I verified my own report",
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/admin access required/i);
  });

  // Test 5: State Machine Transition Validation
  test("5. Linear status workflow rejects invalid status transitions with 400", async () => {
    // Create admin user
    const admin = await User.create({
      name: "Ward Administrator",
      email: "admin@civicfix.org",
      password: "HashedPassword123",
      role: "admin",
    });
    const adminToken = jwtSign(admin._id, "admin");

    // Create issue starting at "reported"
    const issue = await Issue.create({
      title: "Broken streetlight",
      description: "Streetlight off at night",
      category: "streetlight",
      location: { type: "Point", coordinates: [77.6245, 12.9352] },
      status: "reported",
      reportedBy: admin._id,
    });

    // Attempt illegal transition: reported -> in_progress (skipping verified)
    const invalidRes1 = await request(app)
      .patch(`/api/issues/${issue._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "in_progress" });

    expect(invalidRes1.statusCode).toBe(400);
    expect(invalidRes1.body.message).toMatch(/cannot transition issue status/i);

    // Attempt illegal transition: reported -> resolved (skipping verified & in_progress)
    const invalidRes2 = await request(app)
      .patch(`/api/issues/${issue._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "resolved" });

    expect(invalidRes2.statusCode).toBe(400);

    // Valid linear transition: reported -> verified
    const validRes = await request(app)
      .patch(`/api/issues/${issue._id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "verified", remark: "Inspected and confirmed" });

    expect(validRes.statusCode).toBe(200);
    expect(validRes.body.issue.status).toBe("verified");
  });

  // Test 6: Geospatial Duplicate Detection (/api/issues/nearby)
  test("6. /issues/nearby correctly returns issues within radius using 2dsphere index", async () => {
    const user = await User.create({
      name: "GIS Tester",
      email: "gistester@example.com",
      password: "Password123",
      role: "citizen",
    });

    // Issue A: In Koramangala (Coordinates: [77.6245, 12.9352])
    const nearbyIssue = await Issue.create({
      title: "Koramangala Pothole",
      description: "Near 5th block water tank",
      category: "pothole",
      location: { type: "Point", coordinates: [77.6245, 12.9352] },
      status: "reported",
      reportedBy: user._id,
    });

    // Issue B: Far away in Whitefield (Coordinates: [77.7500, 12.9698], ~14 km away)
    await Issue.create({
      title: "Whitefield Garbage",
      description: "Far away issue",
      category: "garbage",
      location: { type: "Point", coordinates: [77.7500, 12.9698] },
      status: "reported",
      reportedBy: user._id,
    });

    // Query near Koramangala with 200m radius
    const res = await request(app).get(
      "/api/issues/nearby?latitude=12.9352&longitude=77.6245&radius=200"
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.issues[0]._id.toString()).toBe(nearbyIssue._id.toString());
    expect(res.body.issues[0].title).toBe("Koramangala Pothole");
  });
});

// Helper function to sign test JWT tokens
function jwtSign(userId, role = "citizen") {
  const jwt = require("jsonwebtoken");
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET || "test_jwt_secret", {
    expiresIn: "1h",
  });
}
