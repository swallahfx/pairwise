import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Upserted by email/name everywhere below, not created — re-running this
// against a database that already has the seed data (e.g. every container
// restart, since docker-compose runs this on every boot) is a no-op
// instead of a crash on a unique constraint.
async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // ---------------------------------------------------------------------
  // Creators — deliberately covers all three gate outcomes (approved,
  // pending, rejected) and gives every niche at least one entry so
  // directory filtering/sorting has something real to filter.
  // ---------------------------------------------------------------------
  const creatorsData = [
    { email: "marabuilds@example.com", name: "Mara Chen", handle: "@marabuilds", platform: "TikTok", followerCount: 34000, engagementRate: 0.061, nicheTags: ["AI Tools"], gateStatus: "APPROVED" as const, rate: { deliverable: "1 TikTok video", priceKobo: 18_000_000, turnaroundDays: 3 } },
    { email: "jordancodes@example.com", name: "Jordan Ade", handle: "@jordancodes", platform: "YouTube", followerCount: 12000, engagementRate: 0.045, nicheTags: ["Dev Tools"], gateStatus: "APPROVED" as const, rate: { deliverable: "1 integration video", priceKobo: 22_000_000, turnaroundDays: 4 } },
    { email: "priyaships@example.com", name: "Priya Nair", handle: "@priyaships", platform: "TikTok", followerCount: 58000, engagementRate: 0.061, nicheTags: ["SaaS"], gateStatus: "APPROVED" as const, rate: { deliverable: "1 TikTok video", priceKobo: 26_000_000, turnaroundDays: 3 } },
    { email: "leo.ships@example.com", name: "Leo Fontaine", handle: "@leo.ships", platform: "X", followerCount: 8000, engagementRate: 0.03, nicheTags: ["Indie Apps"], gateStatus: "APPROVED" as const, rate: { deliverable: "1 thread", priceKobo: 9_000_000, turnaroundDays: 2 } },
    { email: "samreviews@example.com", name: "Sam Okafor", handle: "@samreviews", platform: "Shorts", followerCount: 21000, engagementRate: 0.05, nicheTags: ["Productivity"], gateStatus: "APPROVED" as const, rate: { deliverable: "1 video", priceKobo: 15_000_000, turnaroundDays: 3 } },
    { email: "ivytests@example.com", name: "Ivy Torres", handle: "@ivytests", platform: "TikTok", followerCount: 41000, engagementRate: 0.055, nicheTags: ["Fintech"], gateStatus: "APPROVED" as const, rate: { deliverable: "1 video", priceKobo: 24_000_000, turnaroundDays: 3 } },
    { email: "zainabcodes@example.com", name: "Zainab Bello", handle: "@zainabcodes", platform: "YouTube", followerCount: 27000, engagementRate: 0.052, nicheTags: ["AI Tools"], gateStatus: "APPROVED" as const, rate: { deliverable: "1 tutorial video", priceKobo: 20_000_000, turnaroundDays: 4 } },
    { email: "tundeships@example.com", name: "Tunde Bakare", handle: "@tundeships", platform: "Instagram", followerCount: 19000, engagementRate: 0.058, nicheTags: ["SaaS"], gateStatus: "APPROVED" as const, rate: { deliverable: "1 Reel", priceKobo: 16_000_000, turnaroundDays: 2 } },
    // Clears the bar but hasn't been reviewed yet — keeps the admin
    // creator queue non-empty on a fresh seed.
    { email: "noah.bright@example.com", name: "Noah Bright", handle: "@noahbright", platform: "TikTok", followerCount: 15000, engagementRate: 0.048, nicheTags: ["Fintech"], gateStatus: "PENDING" as const, rate: null },
    // Genuinely fails the eligibility bar — shows the automatic-reject path
    // exists alongside the manual-review one.
    { email: "chidicodes@example.com", name: "Chidi Umeh", handle: "@chidicodes", platform: "X", followerCount: 400, engagementRate: 0.01, nicheTags: ["Dev Tools"], gateStatus: "REJECTED" as const, rate: null }
  ];

  const creatorIds: Record<string, string> = {};
  for (const c of creatorsData) {
    const email = c.email;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash,
        name: c.name,
        role: "CREATOR",
        creatorProfile: {
          create: {
            handle: c.handle,
            platform: c.platform,
            followerCount: c.followerCount,
            engagementRate: c.engagementRate,
            nicheTags: c.nicheTags,
            gateStatus: c.gateStatus,
            ...(c.rate ? { rateCardItems: { create: [c.rate] } } : {})
          }
        }
      }
    });
    const profile = await prisma.creatorProfile.findUniqueOrThrow({ where: { userId: user.id } });
    creatorIds[c.name] = profile.id;
    console.log(`seeded creator ${user.email} (${c.gateStatus.toLowerCase()})`);
  }

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", passwordHash, name: "Platform Admin", role: "ADMIN" }
  });
  console.log("seeded admin admin@example.com");

  // ---------------------------------------------------------------------
  // Brands
  // ---------------------------------------------------------------------
  const brandsData = [
    { email: "brand@example.com", contactName: "Dara Okoye", companyName: "Acme Media", website: "https://acmemedia.example.com", industry: "Media" },
    { email: "techwire@example.com", contactName: "Ngozi Eze", companyName: "TechWire Africa", website: "https://techwire.example.com", industry: "Media & News" },
    { email: "brightfintech@example.com", contactName: "Kunle Adeyemi", companyName: "Bright Fintech Weekly", website: "https://brightfintech.example.com", industry: "Fintech Newsletter" }
  ];

  const brandIds: Record<string, string> = {};
  for (const b of brandsData) {
    const user = await prisma.user.upsert({
      where: { email: b.email },
      update: {},
      create: {
        email: b.email,
        passwordHash,
        name: b.contactName,
        role: "BRAND",
        brandProfile: { create: { companyName: b.companyName, website: b.website, industry: b.industry } }
      }
    });
    const profile = await prisma.brandProfile.findUniqueOrThrow({ where: { userId: user.id } });
    brandIds[b.companyName] = profile.id;
    console.log(`seeded brand ${user.email} (${b.companyName})`);
  }

  // ---------------------------------------------------------------------
  // Upfront listings — mix of both lister types and every gate status, so
  // /upfront, the creator/brand "my listings" tabs, and the admin queue
  // all have real, varied data on a fresh run.
  // ---------------------------------------------------------------------
  const listingsData = [
    { listerType: "BRAND" as const, listerId: brandIds["Acme Media"], title: "Q1 Product Roundup Newsletter", niche: "AI Tools", description: "A dedicated feature slot in our weekly newsletter covering new AI tools.", audienceSummary: "42,000 subscribers, indie hackers and AI Tools builders, ~38% open rate.", pricePerSlotKobo: 120_000_000, totalSlots: 4, programDate: "2027-01-15", gateStatus: "APPROVED" as const },
    { listerType: "CREATOR" as const, listerId: creatorIds["Mara Chen"], title: "Spring TikTok Series", niche: "AI Tools", description: "A planned 6-part TikTok series reviewing new AI tools over March–April.", audienceSummary: "34K followers, 6.1% engagement, TikTok, AI Tools niche.", pricePerSlotKobo: 45_000_000, totalSlots: 6, programDate: "2027-03-01", gateStatus: "APPROVED" as const },
    { listerType: "CREATOR" as const, listerId: creatorIds["Priya Nair"], title: "SaaS Launch Spotlight", niche: "SaaS", description: "One dedicated video spotlighting a new SaaS launch, planned for next quarter.", audienceSummary: "58K followers, 6.1% engagement, TikTok, SaaS niche.", pricePerSlotKobo: 60_000_000, totalSlots: 3, programDate: "2027-02-10", gateStatus: "PENDING" as const },
    { listerType: "BRAND" as const, listerId: brandIds["TechWire Africa"], title: "Weekly Tech Digest Sponsorship", niche: "Dev Tools", description: "A sponsor segment in our weekly roundup of developer tooling news.", audienceSummary: "28,000 subscribers, developers and tech leads across Africa.", pricePerSlotKobo: 90_000_000, totalSlots: 4, programDate: "2027-02-01", gateStatus: "APPROVED" as const },
    { listerType: "BRAND" as const, listerId: brandIds["Bright Fintech Weekly"], title: "Fintech Newsletter Takeover", niche: "Fintech", description: "A full newsletter takeover — your product as the lead story for one edition.", audienceSummary: "19,500 subscribers, fintech founders and operators.", pricePerSlotKobo: 150_000_000, totalSlots: 1, programDate: "2027-03-20", gateStatus: "PENDING" as const },
    { listerType: "CREATOR" as const, listerId: creatorIds["Zainab Bello"], title: "AI Tools Tutorial Series", niche: "AI Tools", description: "A planned 4-part YouTube tutorial series building with new AI tools.", audienceSummary: "27K subscribers, 5.2% engagement, YouTube, AI Tools niche.", pricePerSlotKobo: 55_000_000, totalSlots: 4, programDate: "2027-04-05", gateStatus: "APPROVED" as const },
    { listerType: "CREATOR" as const, listerId: creatorIds["Ivy Torres"], title: "Fintech Explainer Series", niche: "Fintech", description: "A planned 5-part TikTok series explaining fintech products to a general audience.", audienceSummary: "41K followers, 5.5% engagement, TikTok, Fintech niche.", pricePerSlotKobo: 50_000_000, totalSlots: 5, programDate: "2027-02-20", gateStatus: "APPROVED" as const }
  ];

  for (const l of listingsData) {
    if (!l.listerId) continue;
    const existing = await prisma.upfrontListing.findFirst({
      where:
        l.listerType === "CREATOR" ? { creatorId: l.listerId, title: l.title } : { brandId: l.listerId, title: l.title }
    });
    if (existing) continue;
    await prisma.upfrontListing.create({
      data: {
        listerType: l.listerType,
        ...(l.listerType === "CREATOR" ? { creatorId: l.listerId } : { brandId: l.listerId }),
        title: l.title,
        niche: l.niche,
        description: l.description,
        audienceSummary: l.audienceSummary,
        pricePerSlotKobo: l.pricePerSlotKobo,
        totalSlots: l.totalSlots,
        programDate: new Date(l.programDate),
        gateStatus: l.gateStatus
      }
    });
  }
  console.log(`seeded ${listingsData.length} Upfront listings`);

  // ---------------------------------------------------------------------
  // Developers + products
  // ---------------------------------------------------------------------
  const devUser = await prisma.user.upsert({
    where: { email: "dev@example.com" },
    update: {},
    create: { email: "dev@example.com", passwordHash, name: "Alex Rivera", role: "DEVELOPER", developerProfile: { create: {} } },
    include: { developerProfile: true }
  });

  const secondDevUser = await prisma.user.upsert({
    where: { email: "sarah@example.com" },
    update: {},
    create: { email: "sarah@example.com", passwordHash, name: "Sarah Chen", role: "DEVELOPER", developerProfile: { create: {} } },
    include: { developerProfile: true }
  });

  const productsData = [
    { developerId: devUser.developerProfile!.id, name: "Fieldnote", niche: "AI Tools", link: "https://fieldnote.example.com", pitch: "AI meeting notes that write themselves.", monetizationStatus: "EARLY_REVENUE" as const, mrrKobo: 210_000_000, activeUsers: 840 },
    { developerId: devUser.developerProfile!.id, name: "PitchDeck AI", niche: "AI Tools", link: "https://pitchdeckai.example.com", pitch: "Turn a one-line idea into an investor-ready deck.", monetizationStatus: "PRE_REVENUE" as const, mrrKobo: null, activeUsers: 120 },
    { developerId: secondDevUser.developerProfile!.id, name: "Metriq", niche: "SaaS", link: "https://metriq.example.com", pitch: "Usage analytics for indie SaaS, set up in five minutes.", monetizationStatus: "ESTABLISHED" as const, mrrKobo: 480_000_000, activeUsers: 2100 }
  ];

  const productIds: Record<string, string> = {};
  for (const p of productsData) {
    const existing = await prisma.product.findFirst({ where: { developerId: p.developerId, name: p.name } });
    const product =
      existing ??
      (await prisma.product.create({
        data: {
          developerId: p.developerId,
          name: p.name,
          niche: p.niche,
          link: p.link,
          pitch: p.pitch,
          monetizationStatus: p.monetizationStatus,
          mrrKobo: p.mrrKobo,
          activeUsers: p.activeUsers
        }
      }));
    productIds[p.name] = product.id;
  }
  console.log(`seeded developer(s) + ${productsData.length} products`);

  // ---------------------------------------------------------------------
  // Advert requests — open budget requests the requests board would show
  // ---------------------------------------------------------------------
  const requestsData = [
    { developerId: devUser.developerProfile!.id, productId: productIds["Fieldnote"], budgetKobo: 15_000_000, brief: "1 TikTok video showing our AI meeting notes in action.", nicheTags: ["AI Tools"], deadline: "2027-01-30" },
    { developerId: secondDevUser.developerProfile!.id, productId: productIds["Metriq"], budgetKobo: 25_000_000, brief: "1 dedicated review video walking through our analytics dashboard.", nicheTags: ["SaaS"], deadline: "2027-02-15" }
  ];

  for (const r of requestsData) {
    const existing = await prisma.advertRequest.findFirst({ where: { productId: r.productId, brief: r.brief } });
    if (existing) continue;
    await prisma.advertRequest.create({
      data: {
        developerId: r.developerId,
        productId: r.productId,
        budgetKobo: r.budgetKobo,
        brief: r.brief,
        nicheTags: r.nicheTags,
        deadline: new Date(r.deadline)
      }
    });
  }
  console.log(`seeded ${requestsData.length} advert requests`);

  // ---------------------------------------------------------------------
  // Q&A — a couple of sample questions so the new public Q&A section isn't
  // empty on a fresh run: one answered (shows the feature end to end), one
  // still open (shows what an owner sees waiting on them).
  // ---------------------------------------------------------------------
  const maraId = creatorIds["Mara Chen"];
  const tiktokListing = await prisma.upfrontListing.findFirst({ where: { title: "Spring TikTok Series" } });
  if (maraId) {
    const existing = await prisma.question.findFirst({
      where: { creatorId: maraId, questionText: { startsWith: "Do you offer" } }
    });
    if (!existing) {
      await prisma.question.create({
        data: {
          targetType: "CREATOR",
          creatorId: maraId,
          askerId: devUser.id,
          questionText: "Do you offer a discount for booking two videos back to back?",
          answerText: "Yes — 10% off the second booking if it's within the same month.",
          answeredAt: new Date()
        }
      });
    }
  }
  if (tiktokListing) {
    const existing = await prisma.question.findFirst({
      where: { listingId: tiktokListing.id, questionText: { startsWith: "Can the slot" } }
    });
    if (!existing) {
      await prisma.question.create({
        data: {
          targetType: "UPFRONT_LISTING",
          listingId: tiktokListing.id,
          askerId: secondDevUser.id,
          questionText: "Can the slot mention a specific feature, or is it a general shoutout?"
        }
      });
    }
  }
  console.log("seeded sample Q&A");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
