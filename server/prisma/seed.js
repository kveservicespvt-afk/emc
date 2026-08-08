import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { UPLOADS_ROOT } from "../src/lib/upload.js";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Purpose-generated solar-panel imagery (dusty vs. clean) — NOT a third-party
// stock-photo placeholder. Source PNGs are git-tracked under prisma/seed-assets/
// (see gen-seed-images.js) and get copied into /uploads (served statically) here
// so the demo data never shows an unrelated stock photo again.
const PLACEHOLDER_BEFORE = "/uploads/seed/solar-before.png";
const PLACEHOLDER_AFTER = "/uploads/seed/solar-after.png";

function copySeedImages() {
  const destDir = path.join(UPLOADS_ROOT, "seed");
  fs.mkdirSync(destDir, { recursive: true });
  for (const name of ["solar-before.png", "solar-after.png"]) {
    fs.copyFileSync(path.join(__dirname, "seed-assets", name), path.join(destDir, name));
  }
}

async function main() {
  console.log("Copying seed images into /uploads/seed...");
  copySeedImages();

  console.log("Wiping existing data...");
  // Reverse FK-dependency order.
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.serviceReport.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.site.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.aMCPlan.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();
  await prisma.siteSettings.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.pageContent.deleteMany();

  console.log("Seeding services...");
  const [cleaning, audit, restoration, amcService] = await Promise.all([
    prisma.service.create({
      data: {
        name: "Rooftop Solar Cleaning",
        description: "Residential & commercial rooftop panel cleaning using DM water and manual wet/dry methods per MNRE SOP.",
        basePrice: 499,
        pricePerKw: 50,
        category: "CLEANING",
        featuresJson: [
          "Dry + wet cleaning per SOP",
          "DM water (TDS < 50ppm)",
          "Bird-dropping & frame cleaning",
          "Digital before/after report",
        ],
      },
    }),
    prisma.service.create({
      data: {
        name: "Technical Health Audit",
        description: "PR-ratio assessment, visual/thermal inspection, connection and inverter checkup with a digital report.",
        basePrice: 299,
        pricePerKw: 20,
        category: "AUDIT",
        featuresJson: [
          "Visual + thermal inspection option",
          "Connection & inverter checkup",
          "PR-ratio / generation loss assessment",
          "Downloadable digital report",
        ],
      },
    }),
    prisma.service.create({
      data: {
        name: "Premium Deep Cleaning & Stain Removal",
        description: "Hard-water stain and heavy soiling removal with a zero-scratch guarantee.",
        basePrice: 999,
        pricePerKw: 80,
        category: "RESTORATION",
        featuresJson: [
          "Hard-water stain removal",
          "Deep dirt & grime removal",
          "Zero-scratch guarantee",
          "Ideal for panels unclean 6+ months",
        ],
      },
    }),
    prisma.service.create({
      data: {
        name: "AMC Enquiry Visit",
        description: "Entry point for Annual Maintenance Contracts — see AMC Plans for Basic/Standard/Premium tiers.",
        basePrice: 449,
        pricePerKw: 45,
        category: "AMC",
        featuresJson: [
          "Monthly or quarterly scheduling",
          "Tension-free auto-booked visits",
          "Priority slot allocation",
          "See AMC Plans for full pricing",
        ],
      },
    }),
  ]);

  console.log("Seeding AMC plans...");
  const [basicPlan, standardPlan, premiumPlan] = await Promise.all([
    prisma.aMCPlan.create({
      data: {
        name: "Basic Clean (One-Time)",
        frequencyPerYear: 1,
        basePrice: 499,
        pricePerKw: 50,
        includesJson: {
          waterQuality: "DM water (TDS < 50ppm)",
          safety: "Full PPE + DC isolation",
          healthAudit: "Basic visual check",
          report: "Digital report",
        },
      },
    }),
    prisma.aMCPlan.create({
      data: {
        name: "Standard AMC (Quarterly)",
        frequencyPerYear: 4,
        basePrice: 449,
        pricePerKw: 45,
        includesJson: {
          waterQuality: "DM water (TDS < 50ppm)",
          safety: "Full PPE + DC isolation",
          healthAudit: "Quarterly check",
          report: "Digital report",
        },
      },
    }),
    prisma.aMCPlan.create({
      data: {
        name: "Premium AMC (Monthly)",
        frequencyPerYear: 12,
        basePrice: 399,
        pricePerKw: 40,
        includesJson: {
          waterQuality: "DM water (TDS < 50ppm)",
          safety: "Full PPE + DC isolation",
          healthAudit: "Free complete health audit",
          report: "Priority report + analytics",
        },
      },
    }),
  ]);

  console.log("Seeding cities...");
  await Promise.all([
    prisma.city.create({ data: { name: "Hisar", state: "Haryana", status: "LIVE", dustZone: "HIGH" } }),
    prisma.city.create({ data: { name: "Chandigarh", state: "Chandigarh", status: "UPCOMING", dustZone: "MODERATE" } }),
    prisma.city.create({ data: { name: "Panchkula", state: "Haryana", status: "UPCOMING", dustZone: "MODERATE" } }),
    prisma.city.create({ data: { name: "NCR", state: "Delhi NCR", status: "UPCOMING", dustZone: "MODERATE" } }),
  ]);

  console.log("Seeding site settings...");
  await prisma.siteSettings.create({
    data: {
      id: "singleton",
      contactEmail: "contact@easemyclean.com",
      contactPhone: "+91 90500 92092",
      whatsappNumber: "919050092092",
      addressLine: "Hisar, Haryana – 125001, India",
      socialLinksJson: {},
    },
  });

  console.log("Seeding page content (About / Health Audit CMS)...");
  await prisma.pageContent.create({
    data: {
      id: "about",
      contentJson: {
        mission:
          "EaseMyClean Pvt. Ltd. is on a mission to maximize the life and power output of every solar asset we touch. We connect customers with trained, verified technicians for government-guideline compliant cleaning, restoration, and technical maintenance of solar panels and renewable energy systems.",
        problem:
          "Solar assets in India routinely lose 30-50% of their output to dust and soiling. The cleaning market that serves them is fragmented and unorganized — no verified professionals, no standardized pricing, and no digital tracking of service quality. EaseMyClean fixes that with a managed marketplace, an SOP-compliant process, and full digital reporting on every visit.",
        leaders: [
          { name: "Arvind Singla", title: "Director", bio: "Brings a strong background in business strategy and operations, guiding EaseMyClean's long-term growth and governance as part of the Board of Directors." },
          { name: "Lokesh Singla", title: "Director", bio: "Focused on building sustainable, scalable business operations, contributing strategic oversight and industry experience to EaseMyClean's leadership." },
          { name: "Keshav Singla", title: "Director & Group Operations Head, EaseMyClean", bio: "Leads day-to-day operations, growth strategy, and partnerships for EaseMyClean, reporting into the Board of Directors. Keshav is the operational driving force behind the company — from technician training and SOP compliance to expanding EaseMyClean into new cities — and is the primary point of contact for customers and partners." },
        ],
        milestones: [
          { label: "SOP finalized (MNRE/SECI RE/SPC/001/2024 aligned)", status: "completed" },
          { label: "Technician training & PPE certification program launched", status: "completed" },
          { label: "Pilot cleaning operations in Hisar", status: "completed" },
          { label: "Digital booking & reporting platform launch", status: "upcoming" },
          { label: "Expansion to Chandigarh & Panchkula", status: "upcoming" },
          { label: "NCR market entry", status: "upcoming" },
        ],
      },
    },
  });
  await prisma.pageContent.create({
    data: {
      id: "health-audit",
      contentJson: {
        hero: "A diagnostic check-up for your solar plant — ₹299 to ₹999 depending on system size — that tells you exactly how much output you're losing to soiling, and whether anything electrical needs attention.",
        checks: [
          "Soiling loss % (PR-ratio assessment)",
          "Visual panel inspection for cracks/hotspots",
          "Connection & inverter checkup",
          "Optional thermal imaging",
          "Net-meter / generation reading log",
        ],
      },
    },
  });

  console.log("Seeding sample blog post...");
  await prisma.blogPost.create({
    data: {
      title: "How Often Should You Really Clean Your Solar Panels?",
      slug: "how-often-should-you-clean-solar-panels",
      excerpt: "Dust doesn't affect every rooftop equally. Here's how to figure out the right cleaning frequency for your specific location and season.",
      content:
        "## It depends on where you live\n\nHigh-dust regions like Haryana and Rajasthan can see meaningful output loss within 7-10 days of a dust storm, while coastal or monsoon-season installations may go 30-45 days without a noticeable drop.\n\n## The MNRE/SECI guideline baseline\n\nOur SOP (RE/SPC/001/2024) recommends:\n\n- **High-dust zones:** every 7–10 days\n- **Moderate/urban zones:** every 14–21 days\n- **Low-dust/monsoon:** every 30–45 days\n- **After a dust storm:** within 24–48 hours, regardless of schedule\n\n## Why an AMC beats one-off cleaning\n\nA Standard or Premium AMC plan auto-schedules your visits at the right cadence for your dust zone, so you're never guessing — and every visit comes with a digital PR-ratio report so you can see the actual impact.\n\n[Compare AMC plans →](/amc-plans)",
      category: "Maintenance Tips",
      metaTitle: "How Often Should You Clean Solar Panels? | EaseMyClean",
      metaDescription: "A practical guide to solar panel cleaning frequency by dust zone, based on the MNRE/SECI Standard Operating Procedure.",
      status: "PUBLISHED",
      publishedAt: new Date(),
      authorName: "EaseMyClean Team",
    },
  });

  console.log("Seeding technicians...");
  const techDefs = [
    { name: "Suresh Kumar", phone: "+919999900011", zoneCity: "Hisar", rating: 4.8 },
    { name: "Ramesh Yadav", phone: "+919999900012", zoneCity: "Chandigarh", rating: 4.6 },
    { name: "Vikram Singh", phone: "+919999900013", zoneCity: "Panchkula", rating: 4.7 },
    { name: "Anil Kumar", phone: "+919999900014", zoneCity: "NCR", rating: 4.5 },
  ];
  const technicians = [];
  for (const t of techDefs) {
    const user = await prisma.user.create({
      data: { name: t.name, phone: t.phone, role: "TECHNICIAN", otpVerified: true },
    });
    const technician = await prisma.technician.create({
      data: {
        userId: user.id,
        zoneCity: t.zoneCity,
        employmentType: "IN_HOUSE",
        verificationStatus: "verified",
        ratingAvg: t.rating,
        ppeStatusJson: { helmet: "IS 2925", gloves: "IS 4770", harness: "IS 3521", shoes: "IS 15298" },
      },
    });
    technicians.push(technician);
  }

  console.log("Seeding admin/staff...");
  await prisma.user.create({
    data: {
      name: "Keshav Singla",
      email: "admin@easemyclean.com",
      passwordHash: await bcrypt.hash("Admin@123", 10),
      role: "ADMIN",
      staffRole: "SUPER_ADMIN",
      otpVerified: true,
    },
  });

  console.log("Seeding demo customer + site...");
  const customer = await prisma.user.create({
    data: {
      name: "Rohit Sharma",
      phone: "+919999900001",
      email: "rohit.demo@easemyclean.com",
      passwordHash: await bcrypt.hash("Demo@123", 10),
      role: "CUSTOMER",
      otpVerified: true,
    },
  });

  const site = await prisma.site.create({
    data: {
      userId: customer.id,
      label: "Home Rooftop — Hisar",
      addressJson: { line1: "123 Model Town", city: "Hisar", state: "Haryana", pincode: "125001" },
      plantCapacityKw: 5,
      mountType: "ROOFTOP",
    },
  });

  console.log("Seeding bookings across statuses...");
  const today = new Date();
  const daysFromNow = (n) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

  const bookingDefs = [
    { status: "PENDING", days: 5, service: cleaning, technician: null },
    { status: "CONFIRMED", days: 3, service: cleaning, technician: technicians[0] },
    { status: "TECHNICIAN_ASSIGNED", days: 2, service: audit, technician: technicians[1] },
    { status: "IN_PROGRESS", days: 0, service: cleaning, technician: technicians[0] },
    { status: "COMPLETED", days: -7, service: cleaning, technician: technicians[0], report: true, featured: true },
    { status: "COMPLETED", days: -21, service: restoration, technician: technicians[2], report: true },
    { status: "COMPLETED", days: -35, service: audit, technician: technicians[1], report: true },
    { status: "CANCELLED", days: -14, service: cleaning, technician: null },
  ];

  for (const def of bookingDefs) {
    const priceAmount = def.service.basePrice + def.service.pricePerKw * site.plantCapacityKw;
    const booking = await prisma.booking.create({
      data: {
        userId: customer.id,
        siteId: site.id,
        serviceId: def.service.id,
        technicianId: def.technician?.id ?? null,
        scheduledDate: daysFromNow(def.days),
        slotStart: "06:00",
        slotEnd: "09:00",
        status: def.status,
        plantCapacityKw: site.plantCapacityKw,
        priceAmount,
        paymentStatus: def.status === "COMPLETED" ? "SUCCESSFUL" : def.status === "CANCELLED" ? "REFUNDED" : "PENDING",
      },
    });

    if (def.status === "COMPLETED") {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: priceAmount,
          gatewayRef: `pay_seed_${booking.id}`,
          status: "SUCCESSFUL",
          method: "razorpay",
        },
      });
    }

    if (def.report) {
      const prePr = 78 + Math.random() * 5;
      const postPr = prePr + 4;
      await prisma.serviceReport.create({
        data: {
          bookingId: booking.id,
          dcIsolationConfirmed: true,
          cleaningMethod: "WET",
          waterTds: 32,
          waterPh: 7.0,
          areaCleanedSqm: site.plantCapacityKw * 6.5,
          waterUsedL: site.plantCapacityKw * 4,
          prePrRatio: Math.round(prePr * 10) / 10,
          postPrRatio: Math.round(postPr * 10) / 10,
          improvementPct: Math.round((postPr - prePr) * 10) / 10,
          beforePhotoUrl: PLACEHOLDER_BEFORE,
          afterPhotoUrl: PLACEHOLDER_AFTER,
          defectsJson: [],
          electricalChecksJson: { connectors: "ok", dcCableInsulation: "ok", earthing: "ok" },
          technicianSignoffAt: daysFromNow(def.days),
          adminApprovedAt: daysFromNow(def.days + 0.2),
          featuredOnHomepage: !!def.featured,
        },
      });

      await prisma.review.create({
        data: {
          bookingId: booking.id,
          userId: customer.id,
          rating: 5,
          comment: "Panels look brand new, very professional crew.",
        },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo login — customer phone: +919999900001 (OTP mock mode logs the code)");
  console.log("Demo login — admin email: admin@easemyclean.com / password: Admin@123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
