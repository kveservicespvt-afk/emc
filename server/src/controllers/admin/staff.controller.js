import { prisma } from "../../lib/prisma.js";

// Lists ADMIN/STAFF users for "assigned to" dropdowns (Field Leads, and
// reusable anywhere else an admin record needs to be assigned to a staffer).
export async function listStaff(_req, res, next) {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "STAFF"] } },
      select: { id: true, name: true, role: true, staffRole: true },
      orderBy: { name: "asc" },
    });
    res.json({ staff });
  } catch (err) {
    next(err);
  }
}
