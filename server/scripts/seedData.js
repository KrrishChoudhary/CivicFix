// server/scripts/seedData.js
// Realistic Demo Data Generator for CivicFix (Bengaluru Civic Issue Reporter)
// Generates demo citizen accounts, clustered hotspot issues across Bengaluru wards,
// chronological status update workflows, and simulated community upvotes.
//
// Refined with realistic urban priority variance:
// - Heavy Industrial zones (Peenya) & major traffic bottlenecks (Silk Board) have dense clusters,
//   high-severity issues (crushed roads, burst mains, toxic dumping), high citizen upvotes,
//   and high priority scores (60-70+), producing blazing fiery red hotspots on the heatmap.
// - Commercial hubs (Koramangala, Indiranagar, Whitefield) form moderate amber/yellow clusters.
// - Quiet planned residential areas (Malleshwaram, Jayanagar, Basavanagudi) have low counts,
//   minor issues (flickering lamps, small tree branches), 0-1 upvotes, and low scores (12-25),
//   rendering as faint cool blue points.

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const dns = require("dns");

// Ensure reliable DNS resolution for MongoDB Atlas SRV records on Windows
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  // Ignore if custom DNS cannot be set
}

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

// 3. Real Bengaluru Areas with Realistic Urban Tiers
const BENGALURU_AREAS = [
  // TIER 1: Heavy Industrial & Major Choke Bottlenecks (Blazing Red Hotspots: dense, severe, high upvotes, scores 60-70+)
  {
    name: "Peenya Industrial Area",
    lat: 13.0285,
    lng: 77.5190,
    count: 18,
    pin: "560058",
    tier: "industrial_hotspot",
    preferredCategories: ["pothole", "pothole", "water_leak", "water_leak", "garbage"],
    ageMin: 20,
    ageMax: 44,
    upvotesMin: 3,
    upvotesMax: 5,
    resolvedCount: 2, // 16 active issues show up on heatmap
    landmark: "Peenya 2nd Phase Industrial Estate",
  },
  {
    name: "Silk Board / Bommanahalli",
    lat: 12.9176,
    lng: 77.6238,
    count: 16,
    pin: "560068",
    tier: "traffic_hotspot",
    preferredCategories: ["pothole", "pothole", "water_leak", "other", "garbage"],
    ageMin: 18,
    ageMax: 42,
    upvotesMin: 3,
    upvotesMax: 5,
    resolvedCount: 2, // 14 active issues show up on heatmap
    landmark: "Silk Board Junction & Hosur Main Road",
  },

  // TIER 2: Busy Commercial, Tech & Transit Corridors (Amber / Warm Yellow: moderate counts, scores 35-55)
  {
    name: "Whitefield (ITPL)",
    lat: 12.9863,
    lng: 77.7340,
    count: 11,
    pin: "560066",
    tier: "commercial_hub",
    preferredCategories: ["pothole", "garbage", "water_leak", "streetlight"],
    ageMin: 10,
    ageMax: 35,
    upvotesMin: 2,
    upvotesMax: 4,
    resolvedCount: 3,
    landmark: "ITPL Main Road, Whitefield",
  },
  {
    name: "Koramangala",
    lat: 12.9352,
    lng: 77.6245,
    count: 12,
    pin: "560034",
    tier: "commercial_hub",
    preferredCategories: ["garbage", "pothole", "streetlight", "other"],
    ageMin: 8,
    ageMax: 30,
    upvotesMin: 2,
    upvotesMax: 4,
    resolvedCount: 3,
    landmark: "80 Feet Road, Koramangala 5th Block",
  },
  {
    name: "Indiranagar",
    lat: 12.9784,
    lng: 77.6408,
    count: 10,
    pin: "560038",
    tier: "commercial_hub",
    preferredCategories: ["garbage", "streetlight", "pothole", "other"],
    ageMin: 7,
    ageMax: 26,
    upvotesMin: 1,
    upvotesMax: 3,
    resolvedCount: 3,
    landmark: "100 Feet Road, Indiranagar",
  },
  {
    name: "HSR Layout",
    lat: 12.9116,
    lng: 77.6389,
    count: 8,
    pin: "560102",
    tier: "mixed_urban",
    preferredCategories: ["pothole", "streetlight", "garbage", "water_leak"],
    ageMin: 5,
    ageMax: 22,
    upvotesMin: 1,
    upvotesMax: 2,
    resolvedCount: 2,
    landmark: "27th Main Road, HSR Sector 1",
  },

  // TIER 3: Quiet Heritage & Planned Residential Areas (Cool Faint Blue / Cyan: low counts, minor issues, 0-1 upvotes, scores 12-25)
  {
    name: "Malleshwaram",
    lat: 13.0035,
    lng: 77.5710,
    count: 3,
    pin: "560003",
    tier: "residential_low",
    preferredCategories: ["streetlight", "other", "garbage"],
    ageMin: 1,
    ageMax: 6,
    upvotesMin: 0,
    upvotesMax: 1,
    resolvedCount: 2,
    landmark: "Sampige Road, Malleshwaram",
  },
  {
    name: "Jayanagar",
    lat: 12.9250,
    lng: 77.5938,
    count: 3,
    pin: "560041",
    tier: "residential_low",
    preferredCategories: ["streetlight", "other", "pothole"],
    ageMin: 1,
    ageMax: 6,
    upvotesMin: 0,
    upvotesMax: 1,
    resolvedCount: 2,
    landmark: "11th Main, Jayanagar 4th Block",
  },
  {
    name: "Basavanagudi",
    lat: 12.9422,
    lng: 77.5756,
    count: 3,
    pin: "560004",
    tier: "residential_low",
    preferredCategories: ["streetlight", "other"],
    ageMin: 1,
    ageMax: 5,
    upvotesMin: 0,
    upvotesMax: 1,
    resolvedCount: 2,
    landmark: "Bull Temple Road, Basavanagudi",
  },
  {
    name: "Yelahanka",
    lat: 13.1007,
    lng: 77.5963,
    count: 2,
    pin: "560064",
    tier: "residential_low",
    preferredCategories: ["streetlight", "other"],
    ageMin: 1,
    ageMax: 4,
    upvotesMin: 0,
    upvotesMax: 0,
    resolvedCount: 1,
    landmark: "Sector A, Yelahanka New Town",
  },
];

// 4. Realistic Issue Templates per Category (including realistic industrial & choke-point issues)
const TEMPLATES = {
  pothole: [
    {
      title: "Multi-axle container truck asphalt crater on factory carriageway",
      description: "Heavy factory logistics trucks have pulverized the road surface into a 3-foot wide, 8-inch deep crater halting cargo transit.",
    },
    {
      title: "Deep waterlogged road crater on Silk Board flyover underpass",
      description: "Severe road crater submerged in monsoon runoff; two-wheelers are swerving abruptly and hitting the concrete divider.",
    },
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
      title: "Industrial chemical barrels and scrap metal dumping on roadside",
      description: "Unauthorized industrial waste dumping including rusting iron drums, machining swarf, and fiberglass insulation along Peenya 3rd Phase.",
    },
    {
      title: "Overflowing commercial waste bins spilling onto walkway",
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
      title: "Industrial high-mast floodlight outage at cargo junction",
      description: "High-mast tower lights dead for over two weeks, leaving the heavy vehicle crossing in pitch blackness during late-night shift changes.",
    },
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
      title: "High-pressure BWSSB industrial water supply pipeline rupture",
      description: "Major industrial feeder pipe burst, discharging hundreds of thousands of liters of potable water across the factory access road.",
    },
    {
      title: "Submerged stormwater culvert rupture flooding Silk Board service lane",
      description: "Damaged culvert wall allowing high-volume silt-laden stormwater to overflow onto the service road, creating half-kilometer traffic tailbacks.",
    },
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
  ],
  other: [
    {
      title: "Collapsed heavy-vehicle concrete drainage culvert slab",
      description: "Heavy trailer cracked the reinforced concrete slab over the stormwater drain; an open trench now threatens oncoming vehicles.",
    },
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

// 5. Geographic Jitter Helper (~550m radius using uniform polar distribution)
const jitterCoords = (centerLat, centerLng, maxMeters = 550) => {
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
      const existingSeededIssues = await Issue.find({
        $or: [{ isSeeded: true }, { description: /CivicFix Demo/ }],
      }).select("_id");

      const seededIds = existingSeededIssues.map((i) => i._id);

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

    // Step D: Build and Seed Realistic Issues across Bengaluru Areas
    console.log("\n--- Generating Seeded Civic Issues Across Bengaluru Areas ---");

    let totalIssuesCreated = 0;
    let totalStatusUpdatesCreated = 0;
    let totalUpvotesCreated = 0;

    const areaBreakdown = {};
    const categoryBreakdown = {};
    const statusBreakdown = { reported: 0, verified: 0, in_progress: 0, resolved: 0 };
    const priorityScores = [];

    // Pre-calculate status pools for each area:
    // Respects target totals: ~35% reported, ~20% verified, ~20% in_progress, ~25% resolved
    for (const area of BENGALURU_AREAS) {
      areaBreakdown[area.name] = { total: 0, active: 0, resolved: 0, avgPriority: 0 };

      // Build area-specific status pool
      const nonResolvedCount = area.count - area.resolvedCount;
      const reportedCount = Math.round(nonResolvedCount * 0.55); // ~35% of total
      const verifiedCount = Math.round(nonResolvedCount * 0.23); // ~20% of total
      const inProgressCount = nonResolvedCount - reportedCount - verifiedCount; // ~20% of total

      const areaStatusPool = [
        ...Array(reportedCount).fill("reported"),
        ...Array(verifiedCount).fill("verified"),
        ...Array(inProgressCount).fill("in_progress"),
        ...Array(area.resolvedCount).fill("resolved"),
      ];

      // Shuffle statuses within the area
      for (let i = areaStatusPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [areaStatusPool[i], areaStatusPool[j]] = [areaStatusPool[j], areaStatusPool[i]];
      }

      let areaScoreSum = 0;

      for (let k = 0; k < area.count; k++) {
        // Pick category preferentially from area's preferred categories
        const preferred = area.preferredCategories;
        const category = preferred[k % preferred.length];
        const templateList = TEMPLATES[category];
        const template = templateList[k % templateList.length];

        // Jitter coordinates within ~550m of the area center
        const { lat, lng } = jitterCoords(area.lat, area.lng, 550);

        // Pick a random reporting demo citizen
        const reporter = demoUsers[Math.floor(Math.random() * demoUsers.length)];

        // Assign status
        const status = areaStatusPool[k];

        // Age based on area profile
        const ageDays =
          Math.floor(Math.random() * (area.ageMax - area.ageMin + 1)) + area.ageMin;
        const createdAt = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);

        const crossNumber = Math.floor(Math.random() * 18) + 1;
        const address = `${crossNumber}th Cross, near ${area.landmark}, ${area.name}, Bengaluru, Karnataka ${area.pin}`;

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
        areaBreakdown[area.name].total++;
        if (status === "resolved") {
          areaBreakdown[area.name].resolved++;
        } else {
          areaBreakdown[area.name].active++;
        }
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

        // Step 2: "verified"
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

        // Step 3: "in_progress"
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

        // Step 4: "resolved"
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

        // Targeted upvotes based on area profile
        const minVotes = area.upvotesMin;
        const maxVotes = area.upvotesMax;
        const votesToCreate =
          Math.floor(Math.random() * (maxVotes - minVotes + 1)) + minVotes;

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

        // Calculate expected priority score for report logging
        const catWeight =
          category === "pothole" || category === "water_leak"
            ? 3
            : category === "streetlight" || category === "garbage"
            ? 2
            : 1;
        const score =
          status === "resolved"
            ? 0
            : catWeight * 10 + issue.upvoteCount * 2 + Math.min(ageDays, 30);
        if (status !== "resolved") {
          areaScoreSum += score;
          priorityScores.push(score);
        }
      }

      const activeCount = areaBreakdown[area.name].active;
      areaBreakdown[area.name].avgPriority =
        activeCount > 0 ? (areaScoreSum / activeCount).toFixed(1) : 0;
    }

    // Step E: Print Comprehensive Summary
    console.log("\n=================================================");
    console.log("              SEEDING SUMMARY REPORT             ");
    console.log("=================================================");
    console.log(`✓ Total Issues Created:        ${totalIssuesCreated}`);
    console.log(`✓ Total Status Updates:        ${totalStatusUpdatesCreated}`);
    console.log(`✓ Total Community Upvotes:     ${totalUpvotesCreated}`);
    console.log(`✓ Demo Citizens Available:     ${demoUsers.length}`);

    console.log("\n--- Geographical Distribution (Hotspots & Heatmap Tiers) ---");
    for (const [areaName, data] of Object.entries(areaBreakdown)) {
      const areaObj = BENGALURU_AREAS.find((a) => a.name === areaName);
      let tierBadge = "🔵 [RESIDENTIAL LOW]";
      if (areaObj?.tier === "industrial_hotspot") tierBadge = "🔥 [INDUSTRIAL HOTSPOT - BLAZING RED]";
      else if (areaObj?.tier === "traffic_hotspot") tierBadge = "🚗 [TRAFFIC CHOKE - BLAZING RED]";
      else if (areaObj?.tier === "commercial_hub") tierBadge = "🟡 [COMMERCIAL - AMBER/YELLOW]";
      else if (areaObj?.tier === "mixed_urban") tierBadge = "🟢 [MIXED URBAN - MODERATE]";

      console.log(
        `  • ${areaName.padEnd(28)}: Total: ${String(data.total).padStart(2)} | Active: ${String(
          data.active
        ).padStart(2)} | Resolved: ${String(data.resolved).padStart(2)} | Avg Priority: ${String(
          data.avgPriority
        ).padStart(4)} ${tierBadge}`
      );
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

    console.log("\n--- Priority Score Statistics (Active Issues) ---");
    if (priorityScores.length > 0) {
      const minScore = Math.min(...priorityScores);
      const maxScore = Math.max(...priorityScores);
      const avgScore = (
        priorityScores.reduce((a, b) => a + b, 0) / priorityScores.length
      ).toFixed(1);
      console.log(`  • Lowest Active Priority Score:  ${minScore} (Cool Blue)`);
      console.log(`  • Average Active Priority Score: ${avgScore}`);
      console.log(`  • Peak Active Priority Score:    ${maxScore} (Fiery Red Hotspot)`);
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
