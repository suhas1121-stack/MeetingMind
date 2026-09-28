const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const HINDSIGHT_URL =
  process.env.HINDSIGHT_BASE_URL || "http://localhost:8888";

/*
  Create a separate Hindsight memory bank for every contact.

  Rahul  -> meetingmind-rahul
  Suhas  -> meetingmind-suhas
*/
function getBankId(contact) {
  const safeContact = String(contact)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `meetingmind-${safeContact || "default"}`;
}

async function hindsightRequest(endpoint, options = {}) {
  const url = `${HINDSIGHT_URL}${endpoint}`;

  console.log("\n➡️ Hindsight Request:");
  console.log(url);

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 120000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      console.error("\n❌ HINDSIGHT ERROR");
      console.error("Status:", response.status);
      console.error("Response:", data);

      throw new Error(
        `Hindsight ${response.status}: ${
          data?.detail ||
          data?.message ||
          data?.error ||
          data?.raw ||
          "Unknown error"
        }`
      );
    }

    console.log("✅ Hindsight Success");

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "Hindsight request timed out after 2 minutes."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


/* -------------------------------------------------------
   HEALTH
------------------------------------------------------- */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "MeetingMind backend is running 🚀",
    hindsightUrl: HINDSIGHT_URL,
    localHindsight: true,
  });
});


/* -------------------------------------------------------
   RETAIN MEMORY
------------------------------------------------------- */

app.post("/api/memory/retain", async (req, res) => {
  try {
    const { contact, interaction } = req.body;

    if (!contact || !interaction) {
      return res.status(400).json({
        success: false,
        error: "contact and interaction are required",
      });
    }

    const bankId = getBankId(contact);

    console.log("\n🧠 Storing MeetingMind memory...");
    console.log("Contact:", contact);
    console.log("Bank:", bankId);
    console.log("Interaction:", interaction);

    const content =
      `Contact: ${contact}\n\n` +
      `Meeting interaction:\n${interaction}`;

    const result = await hindsightRequest(
      `/v1/default/banks/${bankId}/memories`,
      {
        method: "POST",

        body: JSON.stringify({
          items: [
            {
              content,
              context: `Meeting interaction with ${contact}`,
            },
          ],
        }),
      }
    );

    res.json({
      success: true,
      message: "Memory stored successfully 🧠",
      contact,
      bankId,
      data: result,
    });
  } catch (error) {
    console.error(
      "\n❌ RETAIN ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


/* -------------------------------------------------------
   RECALL MEETING MEMORIES
------------------------------------------------------- */

app.post("/api/memory/recall", async (req, res) => {
  try {
    const { contact } = req.body;

    if (!contact) {
      return res.status(400).json({
        success: false,
        error: "contact is required",
      });
    }

    const bankId = getBankId(contact);

    console.log("\n🔎 Recalling MeetingMind memories...");
    console.log("Contact:", contact);
    console.log("Bank:", bankId);

    const query = `
Prepare me for my upcoming meeting with ${contact}.

Recall information about ${contact} including:
- preferences
- concerns
- previous discussions
- commitments
- pending follow-ups
- unresolved issues
- useful context
`;

    const result = await hindsightRequest(
      `/v1/default/banks/${bankId}/memories/recall`,
      {
        method: "POST",

        body: JSON.stringify({
          query,

          budget: "low",

          max_tokens: 2000,

          prefer_observations: true,

          types: [
            "world",
            "experience",
            "observation",
          ],
        }),
      }
    );

    const memories = result.results || [];

    console.log(
      `✅ Retrieved ${memories.length} memories for ${contact}`
    );

    res.json({
      success: true,
      contact,
      bankId,
      memories,
      count: memories.length,
    });
  } catch (error) {
    console.error(
      "\n❌ RECALL ERROR:",
      error.message
    );

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});


/* -------------------------------------------------------
   START SERVER
------------------------------------------------------- */

app.listen(PORT, () => {
  console.log("");
  console.log("==========================================");
  console.log("🧠 MeetingMind Backend");
  console.log("==========================================");
  console.log(
    `🚀 Server: http://localhost:${PORT}`
  );
  console.log(
    `🧠 Hindsight: ${HINDSIGHT_URL}`
  );
  console.log(
    "🔐 Contact-specific memory banks enabled"
  );
  console.log("==========================================");
  console.log("");
});