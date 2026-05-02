import { Router } from "express";
import { db, leadsTable } from "@workspace/db";
import { CaptureLeadBody } from "@workspace/api-zod";

const router = Router();

router.post("/leads", async (req, res) => {
  try {
    const parsed = CaptureLeadBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }

    const { name, email, company, message } = parsed.data;

    const [lead] = await db
      .insert(leadsTable)
      .values({ name, email, company: company ?? null, message: message ?? null })
      .returning();

    res.status(201).json(lead);
  } catch (err) {
    console.error("Lead capture error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
