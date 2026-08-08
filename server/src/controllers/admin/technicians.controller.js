import { prisma } from "../../lib/prisma.js";

export async function listTechnicians(_req, res, next) {
  try {
    const technicians = await prisma.technician.findMany({
      include: { user: true },
      orderBy: { ratingAvg: "desc" },
    });
    res.json({ technicians });
  } catch (err) {
    next(err);
  }
}
