// server/scripts/seedData.js
// Realistic Demo Data Generator for CivicFix (Bengaluru Civic Issue Reporter)
// Generates demo citizen accounts, clustered hotspot issues across Bengaluru wards,
// chronological status update workflows, and simulated community upvotes.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Issue = require("../models/Issue");
const StatusUpdate = require("../models/StatusUpdate");
const Upvote = require("../models/Upvote");

// 1. Refuse to run in production environment
if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to run seed script in production environment (NODE_ENV=production)!");
  process.exit(1);
}

// 2. Demo Citizens Configuration
const DEMO_CITIZENS = [
  { name: "Aarav Sharma", email: "citizen1@civicfix.demo" },
  { name: "Pooja Reddy", email: "citizen2@civicfix.demo" },
  { name: "Karthik Gowda", email: "citizen3@civicfix.demo" },
  { name: "Ananya Rao", email: "citizen4@civicfix.demo" },
  { name: "Vikram Hegde", email: "citizen5@civicfix.demo" },
  { name: "Sneha Iyer", email: "citizen6@civicfix.demo" },
];
const DEMO_PASSWORD = "Demo@1234";

// 3. Bengaluru Areas with Target Counts (Koramangala & Indiranagar are heavy hotspots)
const BENGALURU_AREAS = [
  { name: "Koramangala", lat: 12.9352, lng: 77.6245, count: 16, pin: "560034" },
  { name: "Indiranagar", lat: 12.9784, lng: 77.6408, count: 14, pin: "560038" },
  { name: "Whitefield", lat: 12.9698, lng: 77.7500, count: 10, pin: "560066" },
  { name: "HSR Layout", lat: 12.9116, lng: 77.6389, count: 10, pin: "560102" },
  { name: "Jayanagar", lat: 12.9250, lng: 77.5938, count: 7, pin: "560041" },
  { name: "Malleshwaram", lat: 13.0035, lng: 77.5710, count: 6, pin: "560003" },
  { name: "BTM Layout", lat: 12.9166, lng: 77.6101, count: 6, pin: "560068" },
  { name: "Electronic City", lat: 12.8452, lng: 77.6602, count: 4, pin: "560100" },
  { name: "Rajajinagar", lat: 12.9918, lng: 77.5530, count: 4, pin: "560010" },
  { name: "Yelahanka", lat: 13.1007, lng: 77.5963, count: 3, pin: "560064" },
];

// 4. Realistic Issue Templates per Category
const TEMPLATES = {
  pothole: [
    {
      title: "Deep crater-like pothole near main traffic junction",
      description: "Severe road crater about 2 feet across and 6 inches deep causing vehicle undercarriage damage and two-wheelers to brake dangerously.",
    },
    {
      title: "Eroded asphalt and loose gravel causing skidding hazard",
      description: "Top layer of asphalt has peeled away following monsoon showers; sharp stones and loose gravel are causing bikes to skid.",
    },
    {
      title: "Sunken manhole frame creating abrupt road depression",
      description: "Manhole surround has settled 4 inches below the road surface, creating an invisible obstacle especially during nighttime.",
    },
    {
      title: "Chain of consecutive potholes along bus transit route",
      description: "Multiple potholes spanning a 50-meter section near the bus stop, forcing city buses and autos into the opposite lane.",
    },
  ],
  garbage: [
    {
      title: "Overflowing municipal waste bins spilling onto walkway",
      description: "Community waste bins have not been cleared by collection trucks for over 4 days. Waste is overflowing onto the pedestrian footpath.",
    },
    {
      title: "Illegal commercial waste dumping on vacant plot",
      description: "Commercial packing boxes, discarded plastic, and food waste being dumped nightly on the corner plot, attracting stray dogs.",
    },
    {
      title: "Uncollected wet waste bags piling up at residential cross",
      description: "Door-to-door sanitation vehicle missed this lane for consecutive days. Piles of garbage bags causing strong foul odor.",
    },
    {
      title: "Construction debris and concrete rubble blocking sidewalk",
      description: "Broken masonry slabs and plaster rubble dumped by building contractors, forcing school children and pedestrians onto the road.",
    },
  ],
  streetlight: [
    {
      title: "Non-functional streetlight on residential crossroad",
      description: "Streetlight fixture #B-14 is completely dead for over a week. Lane is dark after 7 PM, creating safety concerns for residents.",
    },
    {
      title: "Flickering high-pressure sodium street lamp",
      description: "Lamp flickers continuously like a strobe light and shuts off every few minutes, leaving the crossroad in dark intervals.",
    },
    {
      title: "Damaged metal streetlight pole leaning precariously",
      description: "Light pole was grazed by a delivery truck and is now tilted at an angle toward the road, posing an imminent collapse risk.",
    },
    {
      title: "Three consecutive streetlights dark along avenue",
      description: "An entire 150-meter stretch of the avenue is pitch dark due to a tripped circuit or cabling fault. Pedestrians feel unsafe.",
    },
  ],
  water_leak: [
    {
      title: "Burst BWSSB water main flooding avenue road",
      description: "High-pressure clean drinking water pipeline has burst underground; fresh water is gushing across the road and flooding basements.",
    },
    {
      title: "Underground water pipe leakage bubbling through pavement",
      description: "Clean water continuously seeping through road fissures, eroding the sub-base and creating a muddy pool.",
    },
    {
      title: "Broken distribution valve leaking potable water into drain",
      description: "Municipal supply valve has developed a heavy leak; thousands of liters of clean water are flowing wasted into the storm drain daily.",
    },
    {
      title: "Subsurface pipe joint leak causing road sinkhole",
      description: "Water pipeline seepage has loosened the soil under the bitumen, causing the roadside pavement to visibly cave in.",
    },
  ],
  other: [
    {
      title: "Missing storm water drain manhole slab on pedestrian path",
      description: "Heavy concrete drain cover slab is broken and missing, leaving a 4-foot deep open drainage drop directly in the walking path.",
    },
    {
      title: "Low-hanging optical cables dangling dangerously low",
      description: "Overhead communication cables have snapped loose and are hanging 6 feet above ground, catching on auto-rickshaw roofs.",
    },
    {
      title: "Broken and shifted footpath curb stones obstructing wheelchair access",
      description: "Footpath slabs have cracked and shifted due to tree roots, making sidewalk completely inaccessible for senior citizens and wheelchairs.",
    },
    {
      title: "Uprooted tree branches partially blocking roadway",
      description: "Storm snapped a large gulmohar tree branch that fell across half the lane; urgent BBMP forest wing clearance required.",
    },
  ],
};

// 5. Geographic Jitter Helper (~600m radius using uniform polar distribution)
const jitterCoords = (centerLat, centerLng, maxMeters = 600) => {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.sqrt(Math.random()) * maxMeters;
  const deltaLat = (distance * Math.cos(angle)) / 111000;
  const deltaLng =
    (distance * Math.sin(angle)) / (111000 * Math.cos((centerLat * Math.PI) / 180));

  return {
    lat: Number((centerLat + deltaLat).toFixed(6)),
    lng: Number((centerLng + deltaLng).toFixed(6)),
  };
};

// 6. Main Seeding Function
const seedData = async () => {
  const shouldReset = process.argv.includes("--reset");

  console.log("=================================================");
  console.log("   CivicFix Demo Data Seeding Script (Bengaluru) ");
  console.log("=================================================");
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Reset requested: ${shouldReset ? "YES (--reset)" : "NO"}\n`);

  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to database successfully.");

    // Step A: Handle --reset if specified (deletes only seeded demo data)
    if (shouldReset) {
      console.log("\n--- Cleaning up existing seeded demo data ---");
      // Find all seeded issues
      const existingSeededIssues = await Issue.find({
        $or: [{ isSeeded: true }, { description: /CivicFix Demo/ }],
      }).select("_id");

      const seededIds = existingSeededIssues.map((i) => i._id);

      // Delete associated Upvotes, StatusUpdates, and Issues
      const upvotesDeleted = await Upvote.deleteMany({ issue: { $in: seededIds } });
      const updatesDeleted = await StatusUpdate.deleteMany({ issue: { $in: seededIds } });
      const issuesDeleted = await Issue.deleteMany({ _id: { $in: seededIds } });
      const usersDeleted = await User.deleteMany({ email: /@civicfix\.demo$/i });

      console.log(`✓ Removed ${issuesDeleted.deletedCount} seeded issues.`);
      console.log(`✓ Removed ${updatesDeleted.deletedCount} seeded status updates.`);
      console.log(`✓ Removed ${upvotesDeleted.deletedCount} seeded upvotes.`);
      console.log(`✓ Removed ${usersDeleted.deletedCount} demo citizen accounts.`);
      console.log("✓ Reset completed. Proceeding with fresh re-seeding...\n");
    }

    // Step B: Ensure an Admin user exists for status transitions
    let adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.log("No existing admin found. Creating default admin for status updates...");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Admin@12345", salt);
      adminUser = await User.create({
        name: "CivicFix Admin",
        email: "admin@civicfix.org",
        password: hashedPassword,
        role: "admin",
      });
      console.log(`✓ Created admin user: ${adminUser.email}`);
    } else {
      console.log(`✓ Found existing admin user: ${adminUser.email}`);
    }

    // Step C: Create 6 Demo Citizens
    console.log("\n--- Setting up Demo Citizen Accounts ---");
    const demoUsers = [];
    const salt = await bcrypt.genSalt(10);
    const demoHashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);

    for (const citizen of DEMO_CITIZENS) {
      let user = await User.findOne({ email: citizen.email });
      if (!user) {
        user = await User.create({
          name: citizen.name,
          email: citizen.email,
          password: demoHashedPassword,
          role: "citizen",
        });
        console.log(`  + Created user: ${user.name} (${user.email})`);
      } else {
        console.log(`  • User already exists: ${user.name} (${user.email})`);
      }
      demoUsers.push(user);
    }

    // Step D: Build and Seed ~80 Realistic Issues across Bengaluru
    console.log("\n--- Generating Seeded Civic Issues Across Bengaluru Areas ---");

    const categories = ["pothole", "garbage", "streetlight", "water_leak", "other"];

    // Status target distribution across 80 issues:
    // ~35% reported (28), ~20% verified (16), ~20% in_progress (16), ~25% resolved (20)
    const statusPool = [];
    for (let i = 0; i < 28; i++) statusPool.push("reported");
    for (let i = 0; i < 16; i++) statusPool.push("verified");
    for (let i = 0; i < 16; i++) statusPool.push("in_progress");
    for (let i = 0; i < 20; i++) statusPool.push("resolved");

    // Shuffle statusPool
    for (let i = statusPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statusPool[i], statusPool[j]] = [statusPool[j], statusPool[i]];
    }

    let statusIndex = 0;
    let totalIssuesCreated = 0;
    let totalStatusUpdatesCreated = 0;
    let totalUpvotesCreated = 0;

    const areaBreakdown = {};
    const categoryBreakdown = {};
    const statusBreakdown = { reported: 0, verified: 0, in_progress: 0, resolved: 0 };

    for (const area of BENGALURU_AREAS) {
      areaBreakdown[area.name] = 0;

      for (let k = 0; k < area.count; k++) {
        // Pick category and template
        const category = categories[(totalIssuesCreated + k) % categories.length];
        const templateList = TEMPLATES[category];
        const template = templateList[k % templateList.length];

        // Jitter coordinates within 600m of the area center
        const { lat, lng } = jitterCoords(area.lat, area.lng, 600);

        // Pick a random reporting demo citizen
        const reporter = demoUsers[Math.floor(Math.random() * demoUsers.length)];

        // Assign status from target distribution
        const status = statusPool[statusIndex % statusPool.length];
        statusIndex++;

        // Random createdAt date distributed over past 45 days
        const ageDays = Math.floor(Math.random() * 44) + 1; // 1 to 45 days ago
        const createdAt = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);

        const crossNumber = Math.floor(Math.random() * 25) + 1;
        const mainNumber = Math.floor(Math.random() * 15) + 1;
        const address = `${crossNumber}th Cross, ${mainNumber}th Main Road, ${area.name}, Bengaluru, Karnataka ${area.pin}`;

        // 1. Create Issue document
        const issue = await Issue.create({
          title: template.title,
          description: template.description,
          category,
          imageUrl: "", // No images for seeded issues as requested
          location: {
            type: "Point",
            coordinates: [lng, lat], // GeoJSON order: [longitude, latitude]
          },
          address,
          status,
          reportedBy: reporter._id,
          upvoteCount: 0,
          isSeeded: true,
          createdAt,
          updatedAt: createdAt,
        });

        totalIssuesCreated++;
        areaBreakdown[area.name]++;
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
        statusBreakdown[status]++;

        // 2. Generate Chronological Status Updates
        // Step 1: Initial "reported" event
        await StatusUpdate.create({
          issue: issue._id,
          status: "reported",
          updatedBy: reporter._id,
          remark: "Issue reported by citizen via CivicFix mobile web portal",
          createdAt: createdAt,
          updatedAt: createdAt,
        });
        totalStatusUpdatesCreated++;

        let lastDate = new Date(createdAt);

        // Step 2: "verified" (if status is verified, in_progress, or resolved)
        if (status === "verified" || status === "in_progress" || status === "resolved") {
          lastDate = new Date(lastDate.getTime() + (Math.random() * 2 + 1) * 24 * 60 * 60 * 1000);
          if (lastDate > new Date()) lastDate = new Date();

          await StatusUpdate.create({
            issue: issue._id,
            status: "verified",
            updatedBy: adminUser._id,
            remark: "Ward field engineer completed physical site inspection and verified report.",
            createdAt: lastDate,
            updatedAt: lastDate,
          });
          totalStatusUpdatesCreated++;
        }

        // Step 3: "in_progress" (if status is in_progress or resolved)
        if (status === "in_progress" || status === "resolved") {
          lastDate = new Date(lastDate.getTime() + (Math.random() * 3 + 1) * 24 * 60 * 60 * 1000);
          if (lastDate > new Date()) lastDate = new Date();

          await StatusUpdate.create({
            issue: issue._id,
            status: "in_progress",
            updatedBy: adminUser._id,
            remark: "Maintenance contractor assigned and work order issued. Repair team on-site.",
            createdAt: lastDate,
            updatedAt: lastDate,
          });
          totalStatusUpdatesCreated++;
        }

        // Step 4: "resolved" (if status is resolved)
        if (status === "resolved") {
          lastDate = new Date(lastDate.getTime() + (Math.random() * 3 + 1) * 24 * 60 * 60 * 1000);
          if (lastDate > new Date()) lastDate = new Date();

          await StatusUpdate.create({
            issue: issue._id,
            status: "resolved",
            updatedBy: adminUser._id,
            remark: "Infrastructure repair work completed, tested and certified by ward superintendent.",
            createdAt: lastDate,
            updatedAt: lastDate,
          });
          totalStatusUpdatesCreated++;
        }

        // 3. Generate Simulated Citizen Upvotes
        // Citizen can NEVER upvote their own reported issue
        const eligibleVoters = demoUsers.filter(
          (u) => u._id.toString() !== reporter._id.toString()
        );

        // Clustered areas (Koramangala, Indiranagar) or critical issues get more community upvotes
        const isHotspot = area.name === "Koramangala" || area.name === "Indiranagar";
        const maxVotes = isHotspot ? 5 : 3;
        const votesToCreate = Math.floor(Math.random() * (maxVotes + 1)); // 0 to maxVotes

        // Shuffle eligible voters
        const selectedVoters = [...eligibleVoters]
          .sort(() => 0.5 - Math.random())
          .slice(0, votesToCreate);

        for (const voter of selectedVoters) {
          const voteDate = new Date(
            createdAt.getTime() + Math.random() * (Date.now() - createdAt.getTime())
          );

          await Upvote.create({
            issue: issue._id,
            user: voter._id,
            createdAt: voteDate,
            updatedAt: voteDate,
          });
          totalUpvotesCreated++;
        }

        // Keep issue.upvoteCount matching the exact number of Upvote records
        issue.upvoteCount = selectedVoters.length;
        await issue.save();
      }
    }

    // Step E: Print Comprehensive Summary
    console.log("\n=================================================");
    console.log("              SEEDING SUMMARY REPORT             ");
    console.log("=================================================");
    console.log(`✓ Total Issues Created:        ${totalIssuesCreated}`);
    console.log(`✓ Total Status Updates:        ${totalStatusUpdatesCreated}`);
    console.log(`✓ Total Community Upvotes:     ${totalUpvotesCreated}`);
    console.log(`✓ Demo Citizens Available:     ${demoUsers.length}`);

    console.log("\n--- Geographical Distribution (Hotspots) ---");
    for (const [area, count] of Object.entries(areaBreakdown)) {
      const isHotspot = area === "Koramangala" || area === "Indiranagar";
      console.log(`  • ${area.padEnd(16)}: ${count} issues ${isHotspot ? "🔥 [HOTSPOT]" : ""}`);
    }

    console.log("\n--- Category Breakdown ---");
    for (const [cat, count] of Object.entries(categoryBreakdown)) {
      console.log(`  • ${cat.padEnd(16)}: ${count} issues`);
    }

    console.log("\n--- Status Distribution ---");
    for (const [st, count] of Object.entries(statusBreakdown)) {
      const pct = ((count / totalIssuesCreated) * 100).toFixed(1);
      console.log(`  • ${st.padEnd(16)}: ${count} issues (${pct}%)`);
    }

    console.log("\n--- Demo Login Credentials ---");
    console.log("Password for all demo citizens: Demo@1234");
    demoUsers.forEach((u, idx) => {
      console.log(`  [Citizen ${idx + 1}] ${u.email}`);
    });
    console.log(`  [Admin User] ${adminUser.email}`);

    console.log("\n✓ Seeding completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed with error:", error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Execute
seedData();
