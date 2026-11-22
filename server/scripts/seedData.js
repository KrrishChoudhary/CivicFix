// server/scripts/seedData.js
// Dense & Varied Demo Data Generator for CivicFix (Bengaluru Civic Issue Reporter)
//
// Features:
// 1. Production guard: Refuses to run if NODE_ENV === "production"
// 2. Safe reset (--reset): Deletes ONLY seeded issues, their updates/upvotes, and demo users. Non-seeded data is never touched.
// 3. Configurable issue count (--count=N): Defaults to 500 issues.
// 4. Fast batch insertion using insertMany.
// 5. Weighted Bengaluru hotspots:
//    - Very Dense: Koramangala, HSR Layout, Bellandur, Whitefield, Marathahalli
//    - Medium: Indiranagar, BTM Layout, Electronic City, Jayanagar, JP Nagar, Hebbal, Sarjapur Road, KR Puram
//    - Lighter: Malleshwaram, Rajajinagar, Yelahanka, Banashankari, Basavanagudi, Domlur, RT Nagar, Bannerghatta Road
// 6. Gaussian (normal) 2D distribution around area centers (stdDev ~250m - 450m), plus points along busy road corridors
//    (Koramangala to Silk Board, Outer Ring Road between Bellandur and Marathahalli).
// 7. Status distribution (~75% open): ~35% reported, ~20% verified, ~20% in_progress, ~25% resolved.
// 8. Complete, chronological StatusUpdate history per issue.
// 9. Community upvotes widely varied (most 0-3, some 10-40, a few 41-60). Upvote records match upvoteCount,
//    and reporters never upvote their own issues.
// 10. Spread over the last 60 days, realistic titles/descriptions, no images.

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

// 1. Production Guard: Refuse to execute if NODE_ENV is production
if (process.env.NODE_ENV === "production") {
  console.error("❌ Refusing to run seed script in production environment (NODE_ENV=production)!");
  process.exit(1);
}

// 2. Parse CLI Arguments
const shouldReset = process.argv.includes("--reset");
let targetCount = 500;
for (let i = 0; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--count=")) {
    const val = parseInt(arg.split("=")[1], 10);
    if (!isNaN(val) && val > 0) targetCount = val;
  } else if (arg === "--count" && process.argv[i + 1]) {
    const val = parseInt(process.argv[i + 1], 10);
    if (!isNaN(val) && val > 0) targetCount = val;
  }
}

// 3. Demo Citizens Configuration
// 6 core demo citizen accounts + pool of generated citizens for realistic community upvoting (up to 75 citizens)
const BASE_CITIZENS = [
  { name: "Aarav Sharma", email: "citizen1@civicfix.demo" },
  { name: "Pooja Reddy", email: "citizen2@civicfix.demo" },
  { name: "Karthik Gowda", email: "citizen3@civicfix.demo" },
  { name: "Ananya Rao", email: "citizen4@civicfix.demo" },
  { name: "Vikram Hegde", email: "citizen5@civicfix.demo" },
  { name: "Sneha Iyer", email: "citizen6@civicfix.demo" },
];

const CITIZEN_FIRST_NAMES = [
  "Rohan", "Priya", "Rahul", "Deepa", "Suresh", "Kavita", "Aditya", "Meera",
  "Naveen", "Divya", "Ganesh", "Shweta", "Arjun", "Lakshmi", "Manoj", "Anjali",
  "Siddharth", "Bhavana", "Varun", "Sunita", "Harish", "Vidya", "Kiran", "Nandini",
  "Ashwin", "Tanvi", "Nikhil", "Geetha", "Prashanth", "Archana", "Sanjay", "Pavithra",
  "Chethan", "Rashmi", "Vinay", "Sowmya", "Rajesh", "Pallavi", "Vivek", "Preeti",
  "Gautam", "Radhika", "Ramesh", "Deepika", "Mahesh", "Roopa", "Pradeep", "Shruthi",
  "Satish", "Manjula", "Srinivas", "Gayathri", "Mohan", "Rekha", "Ranjit", "Sandhya",
  "Venkatesh", "Chitra", "Raghav", "Lavanya", "Santosh", "Swati", "Dinesh", "Kavya",
  "Hemant", "Keerthi", "Bharath", "Usha", "Guru", "Tejaswini", "Nandita"
];

const CITIZEN_LAST_NAMES = [
  "Kumar", "Patel", "Reddy", "Gowda", "Iyer", "Rao", "Hegde", "Sharma",
  "Nair", "Shetty", "Deshmukh", "Joshi", "Bhat", "Kulkarni", "Menon", "Pillai",
  "Verma", "Prasad", "Naidu", "Swaminathan", "Murthy", "Nambiar", "Acharya"
];

const DEMO_PASSWORD = "Demo@1234";

// 4. Weighted Bengaluru Hotspots (Very Dense, Medium, Lighter)
const BENGALURU_AREAS = [
  // --- VERY DENSE HOTSPOTS (High Weight = 16 each) ---
  {
    name: "Koramangala",
    lat: 12.9352,
    lng: 77.6245,
    pin: "560034",
    tier: "very_dense",
    weight: 16,
    stdDev: 290,
    landmark: "80 Feet Road & Sony World Junction",
    preferredCategories: ["pothole", "garbage", "water_leak", "streetlight", "other"],
  },
  {
    name: "HSR Layout",
    lat: 12.9116,
    lng: 77.6389,
    pin: "560102",
    tier: "very_dense",
    weight: 16,
    stdDev: 300,
    landmark: "27th Main Road, Sector 1 & Agara Lake Road",
    preferredCategories: ["pothole", "streetlight", "water_leak", "garbage"],
  },
  {
    name: "Bellandur",
    lat: 12.9304,
    lng: 77.6784,
    pin: "560103",
    tier: "very_dense",
    weight: 16,
    stdDev: 310,
    landmark: "Bellandur EcoSpace Junction & Central Mall",
    preferredCategories: ["water_leak", "pothole", "garbage", "other"],
  },
  {
    name: "Whitefield",
    lat: 12.9698,
    lng: 77.7500,
    pin: "560066",
    tier: "very_dense",
    weight: 16,
    stdDev: 330,
    landmark: "ITPL Main Road & Hope Farm Junction",
    preferredCategories: ["pothole", "water_leak", "garbage", "streetlight"],
  },
  {
    name: "Marathahalli",
    lat: 12.9591,
    lng: 77.6974,
    pin: "560037",
    tier: "very_dense",
    weight: 16,
    stdDev: 310,
    landmark: "Marathahalli Multiplex & Bridge Service Road",
    preferredCategories: ["pothole", "garbage", "other", "streetlight"],
  },

  // --- MEDIUM DENSITY AREAS (Moderate Weight = 5 each) ---
  {
    name: "Indiranagar",
    lat: 12.9784,
    lng: 77.6408,
    pin: "560038",
    tier: "medium",
    weight: 5,
    stdDev: 340,
    landmark: "100 Feet Road & 12th Main Junction",
    preferredCategories: ["garbage", "pothole", "streetlight", "other"],
  },
  {
    name: "BTM Layout",
    lat: 12.9166,
    lng: 77.6101,
    pin: "560076",
    tier: "medium",
    weight: 5,
    stdDev: 340,
    landmark: "7th Main Road, BTM 2nd Stage",
    preferredCategories: ["pothole", "garbage", "water_leak"],
  },
  {
    name: "Electronic City",
    lat: 12.8452,
    lng: 77.6602,
    pin: "560100",
    tier: "medium",
    weight: 5,
    stdDev: 380,
    landmark: "Velankani Drive & Phase 1 Toll Gate",
    preferredCategories: ["streetlight", "pothole", "water_leak"],
  },
  {
    name: "Jayanagar",
    lat: 12.9250,
    lng: 77.5938,
    pin: "560041",
    tier: "medium",
    weight: 5,
    stdDev: 340,
    landmark: "11th Main Road, Jayanagar 4th Block",
    preferredCategories: ["other", "streetlight", "garbage"],
  },
  {
    name: "JP Nagar",
    lat: 12.9063,
    lng: 77.5857,
    pin: "560078",
    tier: "medium",
    weight: 5,
    stdDev: 350,
    landmark: "24th Main Road, JP Nagar 5th Phase",
    preferredCategories: ["water_leak", "pothole", "streetlight"],
  },
  {
    name: "Hebbal",
    lat: 13.0358,
    lng: 77.5970,
    pin: "560024",
    tier: "medium",
    weight: 5,
    stdDev: 370,
    landmark: "Hebbal Flyover & Bellary Road Junction",
    preferredCategories: ["pothole", "other", "garbage"],
  },
  {
    name: "Sarjapur Road",
    lat: 12.9100,
    lng: 77.6870,
    pin: "560035",
    tier: "medium",
    weight: 5,
    stdDev: 370,
    landmark: "Wipro Corporate Office, Sarjapur Road",
    preferredCategories: ["pothole", "water_leak", "garbage"],
  },
  {
    name: "KR Puram",
    lat: 13.0034,
    lng: 77.6960,
    pin: "560036",
    tier: "medium",
    weight: 5,
    stdDev: 370,
    landmark: "KR Puram Cable-Stayed Bridge & Tin Factory",
    preferredCategories: ["pothole", "garbage", "streetlight"],
  },

  // --- LIGHTER AREAS (Low Weight = 1.5 each) ---
  {
    name: "Malleshwaram",
    lat: 13.0035,
    lng: 77.5710,
    pin: "560003",
    tier: "lighter",
    weight: 1.5,
    stdDev: 400,
    landmark: "Sampige Road & 8th Cross Corner",
    preferredCategories: ["streetlight", "other", "garbage"],
  },
  {
    name: "Rajajinagar",
    lat: 12.9918,
    lng: 77.5530,
    pin: "560010",
    tier: "lighter",
    weight: 1.5,
    stdDev: 400,
    landmark: "Dr. Rajkumar Road, 1st Block",
    preferredCategories: ["other", "pothole", "streetlight"],
  },
  {
    name: "Yelahanka",
    lat: 13.1007,
    lng: 77.5963,
    pin: "560064",
    tier: "lighter",
    weight: 1.5,
    stdDev: 420,
    landmark: "Sector A, Yelahanka New Town",
    preferredCategories: ["streetlight", "other"],
  },
  {
    name: "Banashankari",
    lat: 12.9255,
    lng: 77.5468,
    pin: "560050",
    tier: "lighter",
    weight: 1.5,
    stdDev: 400,
    landmark: "Banashankari BDA Complex 2nd Stage",
    preferredCategories: ["garbage", "streetlight", "other"],
  },
  {
    name: "Basavanagudi",
    lat: 12.9422,
    lng: 77.5750,
    pin: "560004",
    tier: "lighter",
    weight: 1.5,
    stdDev: 380,
    landmark: "Bull Temple Road & Gandhi Bazaar Circle",
    preferredCategories: ["streetlight", "other"],
  },
  {
    name: "Domlur",
    lat: 12.9609,
    lng: 77.6387,
    pin: "560071",
    tier: "lighter",
    weight: 1.5,
    stdDev: 370,
    landmark: "Domlur Flyover & Intermediate Ring Road",
    preferredCategories: ["pothole", "streetlight", "other"],
  },
  {
    name: "RT Nagar",
    lat: 13.0211,
    lng: 77.5960,
    pin: "560032",
    tier: "lighter",
    weight: 1.5,
    stdDev: 400,
    landmark: "Dinnur Main Road & 80 Feet Road Junction",
    preferredCategories: ["garbage", "pothole", "other"],
  },
  {
    name: "Bannerghatta Road",
    lat: 12.8900,
    lng: 77.5970,
    pin: "560076",
    tier: "lighter",
    weight: 1.5,
    stdDev: 420,
    landmark: "Bannerghatta Main Road near Hulimavu Gate",
    preferredCategories: ["pothole", "water_leak", "streetlight"],
  },
];

// Busy Road Corridors for extra linear hotspot clustering
const ROAD_CORRIDORS = {
  koramangalaSilkBoard: {
    start: { lat: 12.9352, lng: 77.6245 }, // Koramangala
    end: { lat: 12.9176, lng: 77.6238 },   // Silk Board Junction
    roadName: "Hosur Road - Silk Board Transit Corridor",
  },
  outerRingRoad: {
    start: { lat: 12.9304, lng: 77.6784 }, // Bellandur
    end: { lat: 12.9591, lng: 77.6974 },   // Marathahalli
    roadName: "Outer Ring Road (ORR) Expressway",
  },
};

// 5. Realistic Issue Templates per Category
const TEMPLATES = {
  pothole: [
    {
      title: "Deep waterlogged asphalt crater on primary arterial carriageway",
      description: "Severe road crater submerged in monsoon runoff; two-wheelers are swerving dangerously into oncoming traffic.",
    },
    {
      title: "Pulverized asphalt crater with sharp edges near bus stop",
      description: "Heavy BMTC buses have broken down the pavement into a 2-foot wide, 6-inch deep crater halting smooth bus entry.",
    },
    {
      title: "Chain of consecutive road potholes along Outer Ring Road service lane",
      description: "Multiple craters spanning 40 meters along the service road, puncturing scooter tires and causing vehicle undercarriage damage.",
    },
    {
      title: "Sunken storm drain manhole surround creating abrupt road depression",
      description: "Cast iron manhole frame has sunk 4 inches below the road surface, forming an invisible obstacle at night.",
    },
    {
      title: "Eroded asphalt and loose gravel causing severe skidding hazard",
      description: "Asphalt wearing course has disintegrated into loose stones, causing two-wheelers to slip during hard braking.",
    },
    {
      title: "Cracked road trench settling after underground cable trenching",
      description: "Utility trench backfilled with loose mud has settled into an uneven, jarring trench across both traffic lanes.",
    },
    {
      title: "Dislodged stone paver block creating deep road void",
      description: "Heavy goods delivery vehicle dislodged concrete pavers at the intersection, leaving open cavities on the roadway.",
    },
  ],
  garbage: [
    {
      title: "Overflowing municipal waste bins spilling onto pedestrian footpath",
      description: "Community waste bins have not been cleared by collection compactor for 4 days. Waste is overflowing onto the walkway.",
    },
    {
      title: "Unauthorized commercial packaging waste dumping on corner plot",
      description: "Cartons, thermocol, and plastic film dumped along the roadside, attracting stray cattle and blocking pedestrian passage.",
    },
    {
      title: "Accumulated domestic wet waste bags piling up at crossroad junction",
      description: "Door-to-door sanitation tipper missed this street consecutively. Piles of garbage bags causing strong foul odor.",
    },
    {
      title: "Construction debris and plaster rubble dumped along street curb",
      description: "Broken masonry slabs and concrete debris left by contractors, forcing school children and walkers onto the road.",
    },
    {
      title: "Unattended garden prunings and dry tree branches choking footpath",
      description: "Tree branches cut down during pre-monsoon trimming have been left on the curb for over a week, trapping litter.",
    },
    {
      title: "Litter accumulation around stormwater drain grating",
      description: "Discarded bottles, plastic bags, and food containers blocking the drain inlet, threatening local road flooding during rain.",
    },
  ],
  streetlight: [
    {
      title: "Non-functional LED streetlight pole leaving crossroad in darkness",
      description: "Fixture #SL-28 is dead for over 10 days. Street intersection is pitch black after 7 PM, creating safety concerns for residents.",
    },
    {
      title: "High-mast tower lights dark at busy grade junction",
      description: "High-mast cluster extinguished for over a week, leaving pedestrian crosswalks completely unlit during peak evening hours.",
    },
    {
      title: "Flickering sodium street lamp causing strobing hazard",
      description: "Lamp continuously flickers like a strobe light and shuts off every few minutes, leaving the street in dark intervals.",
    },
    {
      title: "Damaged streetlight pole leaning precariously toward roadway",
      description: "Light pole was grazed by a delivery truck and is now tilted at an angle toward the road, posing an imminent collapse hazard.",
    },
    {
      title: "Three consecutive streetlights dark along residential avenue",
      description: "An entire 120-meter stretch is pitch dark due to an underground cable fault. Women and elderly pedestrians feel unsafe.",
    },
    {
      title: "Exposed wiring terminal at base of streetlight pole",
      description: "Protective metal hatch on streetlight pole has been vandalized; open live electrical terminals exposed at child height.",
    },
  ],
  water_leak: [
    {
      title: "High-pressure BWSSB primary water distribution main burst",
      description: "Major clean drinking water pipe burst underground; high-pressure potable water is gushing across the road and flooding basements.",
    },
    {
      title: "Clean drinking water supply pipeline fracture bubbling through asphalt",
      description: "Potable supply pipe continuously leaking through road fissures, eroding the pavement sub-base and pooling clean water.",
    },
    {
      title: "Broken municipal distribution valve wasting drinking water into drain",
      description: "Supply valve chamber has developed a heavy leak; thousands of liters of clean municipal water flow wasted into the drain daily.",
    },
    {
      title: "Submerged stormwater culvert rupture flooding service lane",
      description: "Damaged culvert allowing silt-laden stormwater to backflow onto the carriageway, creating waterlogging during moderate rain.",
    },
    {
      title: "Leaking air-release valve on water pipeline creating roadside sinkhole",
      description: "Continuous pressurized spray from water air valve has hollowed out the soil beneath the pavement, creating a cavity.",
    },
  ],
  other: [
    {
      title: "Broken reinforced concrete slab over open roadside stormwater drain",
      description: "Heavy trailer cracked the reinforced drain cover slab; an open 4-foot deep trench now threatens pedestrians and two-wheelers.",
    },
    {
      title: "Low-hanging optical fiber and telecom cables snagging vehicles",
      description: "Overhead cables have snapped loose and are hanging 6 feet above the road, catching on auto-rickshaw hoods and delivery vans.",
    },
    {
      title: "Broken and shifted footpath curb stones obstructing wheelchair access",
      description: "Footpath slabs have cracked and lifted due to tree roots, making the sidewalk impassable for strollers and wheelchair users.",
    },
    {
      title: "Uprooted gulmohar tree branch partially blocking two-way carriageway",
      description: "Storm snapped a large tree limb that fell across half the lane; urgent BBMP forest wing clearance required.",
    },
    {
      title: "Missing cast iron drain grating exposing deep roadside pit",
      description: "Roadside storm drain grating is missing, creating a dangerous fall hazard for pedestrians walking during nighttime.",
    },
    {
      title: "Rusted and damaged road median divider grill jutting into fast lane",
      description: "Impact from a previous collision has left metal divider rails protruding directly into the right-hand vehicular lane.",
    },
  ],
};

// 6. Gaussian (Normal) 2D Spatial Sampling Helper (Box-Muller Transform)
// Standard deviation between 250m and 450m produces tight clustering with realistic radial thinning
const sampleGaussian2D = (centerLat, centerLng, stdDevMeters = 320) => {
  let u1 = 0;
  let u2 = 0;
  while (u1 === 0) u1 = Math.random();
  while (u2 === 0) u2 = Math.random();

  const r = Math.sqrt(-2.0 * Math.log(u1));
  const theta = 2.0 * Math.PI * u2;

  const dxMeters = r * Math.cos(theta) * stdDevMeters;
  const dyMeters = r * Math.sin(theta) * stdDevMeters;

  const deltaLat = dyMeters / 111000;
  const deltaLng = dxMeters / (111000 * Math.cos((centerLat * Math.PI) / 180));

  return {
    lat: Number((centerLat + deltaLat).toFixed(6)),
    lng: Number((centerLng + deltaLng).toFixed(6)),
  };
};

// Sample along a road corridor line with a tight perpendicular Gaussian jitter (~35-45m)
const sampleRoadCorridor = (startCoord, endCoord, stdDevMeters = 40) => {
  const t = Math.random();
  const baseLat = startCoord.lat + t * (endCoord.lat - startCoord.lat);
  const baseLng = startCoord.lng + t * (endCoord.lng - startCoord.lng);
  return sampleGaussian2D(baseLat, baseLng, stdDevMeters);
};

// 7. Weighted Random Area Selection Helper
const buildAreaCumulativeWeights = () => {
  let sum = 0;
  return BENGALURU_AREAS.map((area) => {
    sum += area.weight;
    return { area, cumulative: sum };
  });
};

const chooseWeightedArea = (cumulativeList, totalWeight) => {
  const r = Math.random() * totalWeight;
  for (const entry of cumulativeList) {
    if (r <= entry.cumulative) {
      return entry.area;
    }
  }
  return cumulativeList[cumulativeList.length - 1].area;
};

// 8. Dynamic Upvote Count Selection (wide variance: most 0-3, some 10-40, a few 41-60)
const sampleTargetUpvotes = (areaTier, maxEligible) => {
  const rand = Math.random();

  if (areaTier === "very_dense") {
    // Hotspots receive higher community urgency and viral upvotes
    if (rand < 0.52) {
      // ~52%: most 0 to 3
      return Math.floor(Math.random() * 4); // 0, 1, 2, 3
    } else if (rand < 0.84) {
      // ~32%: some 10 to 40
      const count = Math.floor(Math.random() * 31) + 10;
      return Math.min(count, maxEligible);
    } else {
      // ~16%: a few higher (41 to 60)
      const count = Math.floor(Math.random() * 20) + 41;
      return Math.min(count, maxEligible);
    }
  } else if (areaTier === "medium") {
    if (rand < 0.72) {
      return Math.floor(Math.random() * 4); // 0 to 3
    } else if (rand < 0.94) {
      const count = Math.floor(Math.random() * 21) + 10; // 10 to 30
      return Math.min(count, maxEligible);
    } else {
      const count = Math.floor(Math.random() * 12) + 31; // 31 to 42
      return Math.min(count, maxEligible);
    }
  } else {
    // Lighter areas
    if (rand < 0.88) {
      return Math.floor(Math.random() * 4); // 0 to 3
    } else {
      const count = Math.floor(Math.random() * 11) + 5; // 5 to 15
      return Math.min(count, maxEligible);
    }
  }
};

// Partial Fisher-Yates shuffle to pick k unique elements from an array
const sampleUniqueElements = (array, k) => {
  const result = [];
  const len = array.length;
  if (k <= 0) return result;
  const picked = new Set();
  const target = Math.min(k, len);

  while (picked.size < target) {
    const idx = Math.floor(Math.random() * len);
    if (!picked.has(idx)) {
      picked.add(idx);
      result.push(array[idx]);
    }
  }
  return result;
};

// 9. Main Seeding Function
const seedData = async () => {
  console.log("=================================================");
  console.log("   CivicFix Demo Data Seeding Script (Bengaluru) ");
  console.log("=================================================");
  console.log(`Environment:     ${process.env.NODE_ENV || "development"}`);
  console.log(`Reset requested: ${shouldReset ? "YES (--reset)" : "NO"}`);
  console.log(`Target Issues:   ${targetCount} issues`);
  console.log("=================================================\n");

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

    // Step B: Ensure default Admin user exists for status workflow audits
    let adminUser = await User.findOne({ role: "admin" });
    if (!adminUser) {
      console.log("Creating default admin user for status audits...");
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

    // Step C: Set up Demo Citizen Pool (up to 75 citizens for realistic multi-user upvotes)
    console.log("\n--- Setting up Demo Citizen Accounts Pool ---");
    const salt = await bcrypt.genSalt(10);
    const demoHashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);

    // Build desired demo citizen roster (75 citizens)
    const desiredCitizens = [...BASE_CITIZENS];
    let nameIdx = 0;
    while (desiredCitizens.length < 75) {
      const fName = CITIZEN_FIRST_NAMES[nameIdx % CITIZEN_FIRST_NAMES.length];
      const lName = CITIZEN_LAST_NAMES[Math.floor(nameIdx / CITIZEN_FIRST_NAMES.length) % CITIZEN_LAST_NAMES.length];
      const idNum = desiredCitizens.length + 1;
      desiredCitizens.push({
        name: `${fName} ${lName}`,
        email: `citizen${idNum}@civicfix.demo`,
      });
      nameIdx++;
    }

    // Fetch existing demo citizens in database
    const existingDemoUsers = await User.find({ email: /@civicfix\.demo$/i });
    const existingEmailMap = new Map(existingDemoUsers.map((u) => [u.email.toLowerCase(), u]));

    const usersToInsert = [];
    const demoUsers = [];

    for (const citizen of desiredCitizens) {
      const existing = existingEmailMap.get(citizen.email.toLowerCase());
      if (existing) {
        demoUsers.push(existing);
      } else {
        usersToInsert.push({
          name: citizen.name,
          email: citizen.email,
          password: demoHashedPassword,
          role: "citizen",
        });
      }
    }

    if (usersToInsert.length > 0) {
      console.log(`  + Bulk creating ${usersToInsert.length} demo citizen accounts...`);
      const inserted = await User.insertMany(usersToInsert, { ordered: false });
      demoUsers.push(...inserted);
      console.log(`  ✓ Inserted ${inserted.length} demo accounts.`);
    }
    console.log(`✓ Active demo citizen pool size: ${demoUsers.length} accounts.`);

    // Step D: Calculate Status Allocation
    // Requirement: ~75% open: ~35% reported, ~20% verified, ~20% in_progress, ~25% resolved
    const reportedTarget = Math.round(targetCount * 0.35);
    const verifiedTarget = Math.round(targetCount * 0.20);
    const inProgressTarget = Math.round(targetCount * 0.20);
    const resolvedTarget = targetCount - (reportedTarget + verifiedTarget + inProgressTarget);

    const statusPool = [
      ...Array(reportedTarget).fill("reported"),
      ...Array(verifiedTarget).fill("verified"),
      ...Array(inProgressTarget).fill("in_progress"),
      ...Array(resolvedTarget).fill("resolved"),
    ];

    // Shuffle status pool
    for (let i = statusPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statusPool[i], statusPool[j]] = [statusPool[j], statusPool[i]];
    }

    // Step E: Prepare Area Weights for Gaussian Distribution
    const cumulativeWeights = buildAreaCumulativeWeights();
    const totalWeight = cumulativeWeights[cumulativeWeights.length - 1].cumulative;

    // In-memory collections for fast insertMany batching
    const issueDocs = [];
    const statusUpdateDocs = [];
    const upvoteDocs = [];

    const areaMetrics = {};
    for (const a of BENGALURU_AREAS) {
      areaMetrics[a.name] = { total: 0, active: 0, resolved: 0, totalUpvotes: 0, tier: a.tier };
    }
    const statusCounts = { reported: 0, verified: 0, in_progress: 0, resolved: 0 };
    const categoryCounts = {};
    const upvoteDist = { "0-3": 0, "10-40": 0, "41+": 0 };

    console.log(`\n--- Synthesizing ${targetCount} Issues with Gaussian Clustering ---`);

    const now = Date.now();
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

    for (let k = 0; k < targetCount; k++) {
      const issueId = new mongoose.Types.ObjectId();

      // 1. Pick area based on weights (Very Dense areas get ~60% of total)
      const area = chooseWeightedArea(cumulativeWeights, totalWeight);

      // 2. Sample coordinates: Gaussian around area center, or along corridor
      let lat, lng;
      const corridorChance = Math.random();

      if (area.name === "Koramangala" && corridorChance < 0.32) {
        // Place along Koramangala - Silk Board corridor
        const coords = sampleRoadCorridor(
          ROAD_CORRIDORS.koramangalaSilkBoard.start,
          ROAD_CORRIDORS.koramangalaSilkBoard.end,
          40
        );
        lat = coords.lat;
        lng = coords.lng;
      } else if ((area.name === "Bellandur" || area.name === "Marathahalli") && corridorChance < 0.35) {
        // Place along Outer Ring Road corridor between Bellandur and Marathahalli
        const coords = sampleRoadCorridor(
          ROAD_CORRIDORS.outerRingRoad.start,
          ROAD_CORRIDORS.outerRingRoad.end,
          40
        );
        lat = coords.lat;
        lng = coords.lng;
      } else {
        // Standard 2D Gaussian distribution around area center
        const coords = sampleGaussian2D(area.lat, area.lng, area.stdDev);
        lat = coords.lat;
        lng = coords.lng;
      }

      // 3. Category & Template selection
      const preferred = area.preferredCategories;
      const category = preferred[Math.floor(Math.random() * preferred.length)];
      const templatesList = TEMPLATES[category];
      const template = templatesList[Math.floor(Math.random() * templatesList.length)];

      categoryCounts[category] = (categoryCounts[category] || 0) + 1;

      // 4. Reporting Demo Citizen
      const reporter = demoUsers[Math.floor(Math.random() * demoUsers.length)];

      // 5. Status assignment
      const status = statusPool[k];
      statusCounts[status]++;

      // 6. Realistic Age spread over the last 60 days
      const ageDays = Math.random() * 60;
      const createdAt = new Date(now - ageDays * 24 * 60 * 60 * 1000);

      // 7. Realistic Address incorporating cross street, landmark, area and pincode
      const crossNum = Math.floor(Math.random() * 22) + 1;
      const mainNum = Math.floor(Math.random() * 8) + 1;
      const address = `${crossNum}th Cross, ${mainNum}th Main, near ${area.landmark}, ${area.name}, Bengaluru, Karnataka ${area.pin}`;

      // 8. Simulated Community Upvotes (Varying widely: most 0-3, some 10-40, a few 41-60)
      // Citizen can NEVER upvote their own reported issue
      const eligibleVoters = demoUsers.filter(
        (u) => u._id.toString() !== reporter._id.toString()
      );

      const targetVotes = sampleTargetUpvotes(area.tier, eligibleVoters.length);
      const chosenVoters = sampleUniqueElements(eligibleVoters, targetVotes);

      // Track upvote distribution metric
      if (chosenVoters.length <= 3) upvoteDist["0-3"]++;
      else if (chosenVoters.length <= 40) upvoteDist["10-40"]++;
      else upvoteDist["41+"]++;

      // Create Upvote records with chronological timestamps between createdAt and now
      for (const voter of chosenVoters) {
        const voteOffset = Math.random() * (now - createdAt.getTime());
        const voteDate = new Date(createdAt.getTime() + voteOffset);
        upvoteDocs.push({
          issue: issueId,
          user: voter._id,
          createdAt: voteDate,
          updatedAt: voteDate,
        });
      }

      // 9. StatusUpdate Chronological History
      // Event 1: Initial "reported" event by citizen
      statusUpdateDocs.push({
        issue: issueId,
        status: "reported",
        updatedBy: reporter._id,
        remark: "Issue reported by citizen via CivicFix mobile web portal",
        createdAt: createdAt,
        updatedAt: createdAt,
      });

      let lastDate = new Date(createdAt);

      // Event 2: "verified" by admin
      if (status === "verified" || status === "in_progress" || status === "resolved") {
        lastDate = new Date(lastDate.getTime() + (Math.random() * 2 + 1) * 24 * 60 * 60 * 1000);
        if (lastDate > new Date()) lastDate = new Date();

        statusUpdateDocs.push({
          issue: issueId,
          status: "verified",
          updatedBy: adminUser._id,
          remark: "Ward field engineer completed physical site inspection and verified report.",
          createdAt: lastDate,
          updatedAt: lastDate,
        });
      }

      // Event 3: "in_progress" by admin
      if (status === "in_progress" || status === "resolved") {
        lastDate = new Date(lastDate.getTime() + (Math.random() * 3 + 1) * 24 * 60 * 60 * 1000);
        if (lastDate > new Date()) lastDate = new Date();

        statusUpdateDocs.push({
          issue: issueId,
          status: "in_progress",
          updatedBy: adminUser._id,
          remark: "Maintenance contractor assigned and work order issued. Repair team on-site.",
          createdAt: lastDate,
          updatedAt: lastDate,
        });
      }

      // Event 4: "resolved" by admin
      if (status === "resolved") {
        lastDate = new Date(lastDate.getTime() + (Math.random() * 3 + 1) * 24 * 60 * 60 * 1000);
        if (lastDate > new Date()) lastDate = new Date();

        statusUpdateDocs.push({
          issue: issueId,
          status: "resolved",
          updatedBy: adminUser._id,
          remark: "Infrastructure repair work completed, tested and certified by ward superintendent.",
          createdAt: lastDate,
          updatedAt: lastDate,
        });
      }

      // 10. Assemble Issue document
      issueDocs.push({
        _id: issueId,
        title: template.title,
        description: template.description,
        category,
        imageUrl: "", // No images for seeded issues as requested
        location: {
          type: "Point",
          coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
        },
        address,
        status,
        reportedBy: reporter._id,
        upvoteCount: chosenVoters.length, // Strictly equal to the number of Upvote records
        isSeeded: true, // Marker for safe selective reset
        createdAt,
        updatedAt: lastDate,
      });

      // Update metrics
      areaMetrics[area.name].total++;
      if (status === "resolved") {
        areaMetrics[area.name].resolved++;
      } else {
        areaMetrics[area.name].active++;
      }
      areaMetrics[area.name].totalUpvotes += chosenVoters.length;
    }

    // Step F: Fast Batch Insertion into MongoDB Atlas
    console.log(`\n--- Executing Batch Inserts (insertMany) ---`);
    console.log(`  • Inserting ${issueDocs.length} Issue records...`);
    await Issue.insertMany(issueDocs, { ordered: false });
    console.log(`  ✓ Issues inserted successfully.`);

    console.log(`  • Inserting ${statusUpdateDocs.length} StatusUpdate history records...`);
    await StatusUpdate.insertMany(statusUpdateDocs, { ordered: false });
    console.log(`  ✓ Status updates inserted successfully.`);

    console.log(`  • Inserting ${upvoteDocs.length} Upvote records in batches...`);
    const BATCH_SIZE = 2500;
    for (let i = 0; i < upvoteDocs.length; i += BATCH_SIZE) {
      const batch = upvoteDocs.slice(i, i + BATCH_SIZE);
      await Upvote.insertMany(batch, { ordered: false });
    }
    console.log(`  ✓ All ${upvoteDocs.length} community upvotes inserted successfully.`);

    // Step G: Print Comprehensive Seeding Summary
    console.log("\n=================================================");
    console.log("             SEEDING SUMMARY REPORT              ");
    console.log("=================================================");
    console.log(`✓ Total Issues Created:        ${issueDocs.length}`);
    console.log(`✓ Total Status Updates:        ${statusUpdateDocs.length}`);
    console.log(`✓ Total Community Upvotes:     ${upvoteDocs.length}`);
    console.log(`✓ Active Demo Citizens:        ${demoUsers.length}`);

    console.log("\n--- Per-Status Distribution ---");
    for (const [st, count] of Object.entries(statusCounts)) {
      const pct = ((count / issueDocs.length) * 100).toFixed(1);
      console.log(`  • ${st.padEnd(14)}: ${String(count).padStart(3)} issues (${pct}%)`);
    }

    console.log("\n--- Category Breakdown ---");
    for (const [cat, count] of Object.entries(categoryCounts)) {
      const pct = ((count / issueDocs.length) * 100).toFixed(1);
      console.log(`  • ${cat.padEnd(14)}: ${String(count).padStart(3)} issues (${pct}%)`);
    }

    console.log("\n--- Top 5 Hotspot Areas (Dense Clusters) ---");
    const sortedAreas = Object.entries(areaMetrics).sort(
      (a, b) => b[1].total - a[1].total
    );

    sortedAreas.slice(0, 5).forEach(([name, data], idx) => {
      const avgUpvotes = (data.totalUpvotes / data.total).toFixed(1);
      console.log(
        `  ${idx + 1}. ${name.padEnd(18)}: Total: ${String(data.total).padStart(3)} | Active: ${String(
          data.active
        ).padStart(3)} | Resolved: ${String(data.resolved).padStart(3)} | Avg Upvotes: ${avgUpvotes}`
      );
    });

    console.log("\n--- Full Geographical Breakdown ---");
    for (const [name, data] of sortedAreas) {
      const avgUpvotes = data.total > 0 ? (data.totalUpvotes / data.total).toFixed(1) : "0.0";
      let tierBadge = "[LIGHT]";
      if (data.tier === "very_dense") tierBadge = "🔥 [VERY DENSE HOTSPOT]";
      else if (data.tier === "medium") tierBadge = "🟡 [MEDIUM DENSITY]";

      console.log(
        `  • ${name.padEnd(20)}: Total: ${String(data.total).padStart(3)} | Active: ${String(
          data.active
        ).padStart(3)} | Resolved: ${String(data.resolved).padStart(3)} | Avg Upvotes: ${avgUpvotes.padStart(4)} ${tierBadge}`
      );
    }

    console.log("\n--- Community Upvote Distribution ---");
    console.log(`  • 0 to 3 Upvotes:     ${upvoteDist["0-3"]} issues (${((upvoteDist["0-3"] / targetCount) * 100).toFixed(1)}%)`);
    console.log(`  • 10 to 40 Upvotes:   ${upvoteDist["10-40"]} issues (${((upvoteDist["10-40"] / targetCount) * 100).toFixed(1)}%)`);
    console.log(`  • 41+ Upvotes:        ${upvoteDist["41+"]} issues (${((upvoteDist["41+"] / targetCount) * 100).toFixed(1)}%)`);

    console.log("\n--- Demo Login Credentials ---");
    console.log("Password for all demo accounts: Demo@1234");
    console.log("Key demo citizen accounts:");
    BASE_CITIZENS.forEach((c, idx) => {
      console.log(`  [Citizen ${idx + 1}] ${c.email} (${c.name})`);
    });
    console.log(`  [Admin User] admin@civicfix.org (Password: Admin@12345)`);

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
