import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import prisma from "../../../lib/prisma";

// Validate the timezone is a real IANA timezone
function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { timezone } = req.body;
  if (!timezone || !isValidTimezone(timezone)) {
    return res.status(400).json({ error: "Invalid timezone" });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { timezone },
    });

    return res.status(200).json({ success: true, timezone });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
}