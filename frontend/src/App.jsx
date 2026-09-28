import { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function cleanMemory(text) {
  if (!text) return "";

  let cleaned = text;

  // Remove the stored chunk wrapper reliably.
  const marker = cleaned.toLowerCase().indexOf("meeting interaction:");
  if (marker !== -1) {
    cleaned = cleaned.slice(marker + "meeting interaction:".length);
  }

  // Remove Hindsight metadata such as timestamps and actor information.
  cleaned = cleaned.replace(/\|\s*When:.*?(?=\||$)/gi, "");
  cleaned = cleaned.replace(/\|\s*Involving:.*$/gi, "");
  cleaned = cleaned.replace(/^When:\s*.*$/i, "");

  // Remove duplicate whitespace.
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

function shouldShowMemory(text) {
  if (!text) return false;

  const lower = text.toLowerCase().trim();

  // Hide generic system-generated history entries that add no meeting context.
  if (
    lower === "user has a meeting with rahul" ||
    lower === "user has been in a meeting with rahul" ||
    lower === "user has been in contact with rahul"
  ) {
    return false;
  }

  return true;
}

function classifyMemory(text) {
  const lower = text.toLowerCase();

  // Commitments should be checked BEFORE concerns
  if (
    lower.includes("asked us to send") ||
    lower.includes("asked to send") ||
    lower.includes("send the security documentation") ||
    lower.includes("follow up") ||
    lower.includes("needs to send") ||
    lower.includes("promised")
  ) {
    return "commitment";
  }

  if (
    lower.includes("prefers") ||
    lower.includes("preference") ||
    lower.includes("quarterly billing") ||
    lower.includes("likes") ||
    lower.includes("prefers")
  ) {
    return "preference";
  }

  if (
    lower.includes("concerned about") ||
    lower.includes("security concern") ||
    lower.includes("concern") ||
    lower.includes("worried about") ||
    lower.includes("issue with") ||
    lower.includes("problem with")
  ) {
    return "concern";
  }

  if (
    lower.includes("meeting") ||
    lower.includes("conversation") ||
    lower.includes("contact")
  ) {
    return "interaction";
  }

  return "interaction";
}

function uniqueMemories(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = item.text
      .toLowerCase()
      .replace(/[.!?]+$/g, "")
      .trim();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function App() {
  const [contact, setContact] = useState("");
  const [interaction, setInteraction] = useState("");

  const [memoryStatus, setMemoryStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [recalling, setRecalling] = useState(false);

  const [memories, setMemories] = useState(null);

  async function rememberInteraction() {
    if (!contact.trim() || !interaction.trim()) {
      setMemoryStatus(
        "Please enter a contact and interaction."
      );
      return;
    }

    setSaving(true);
    setMemoryStatus("");

    try {
      const response = await fetch(
        `${API_URL}/memory/retain`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contact: contact.trim(),
            interaction: interaction.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to store memory"
        );
      }

      setMemoryStatus(
        "✓ Memory stored in Hindsight 🧠"
      );

      setInteraction("");
    } catch (error) {
      console.error("Remember error:", error);

      setMemoryStatus(
        `❌ ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  }

  async function prepareMeeting() {
    if (!contact.trim()) {
      setMemoryStatus(
        "Please enter a contact name."
      );
      return;
    }

    setMemories(null);
    setRecalling(true);
    setMemoryStatus("");

    try {
      const response = await fetch(
        `${API_URL}/memory/recall`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contact: contact.trim(),
            query:
              "Prepare me for my upcoming meeting. Recall previous discussions, concerns, preferences, commitments, unresolved issues and useful talking points.",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to recall memories"
        );
      }

      setMemories(data.memories || []);
    } catch (error) {
      console.error("Recall error:", error);

      setMemoryStatus(
        `❌ ${error.message}`
      );
    } finally {
      setRecalling(false);
    }
  }

  const processedMemories = uniqueMemories(
    (memories || [])
      .map((memory) => {
        const rawText =
          memory.text ||
          memory.content ||
          memory.snippet ||
          "";

        const text = cleanMemory(rawText);

        return {
          ...memory,
          text,
          category: classifyMemory(text),
        };
      })
      .filter((memory) => shouldShowMemory(memory.text))
      .filter((memory) => memory.text)
  );

  const preferences = processedMemories.filter(
    (memory) =>
      memory.category === "preference"
  );

  const concerns = processedMemories.filter(
    (memory) =>
      memory.category === "concern"
  );

  const commitments = processedMemories.filter(
    (memory) =>
      memory.category === "commitment"
  );

  const interactions = processedMemories.filter(
    (memory) =>
      memory.category === "interaction"
  );

  return (
    <div className="app">

      <div className="background-glow glow-one"></div>
      <div className="background-glow glow-two"></div>

      {/* NAVBAR */}

      <header className="navbar">

        <div className="brand">

          <div className="brand-icon">
            🧠
          </div>

          <div>
            <h2>MeetingMind</h2>

            <span>
              Memory-powered meetings
            </span>
          </div>

        </div>

        <div className="status">

          <span className="status-dot"></span>

          Hindsight Connected

        </div>

      </header>

      <main className="container">

        {/* HERO */}

        <section className="hero">

          <div className="badge">
            ✨ AI Meeting Preparation Agent
          </div>

          <h1>
            Your meetings.
            <br />
            <span>Remembered.</span>
          </h1>

          <p>
            MeetingMind remembers every conversation,
            preference, concern and commitment — so you
            never walk into a meeting without context.
          </p>

        </section>

        {/* WORKSPACE */}

        <section className="workspace">

          {/* MEMORY INPUT */}

          <div className="card">

            <div className="card-header">

              <div>

                <h3>
                  🧠 Teach MeetingMind
                </h3>

                <p>
                  Store something you learned
                  during a conversation.
                </p>

              </div>

              <span className="memory-label">
                HINDSIGHT MEMORY
              </span>

            </div>

            <label>
              Contact
            </label>

            <input
              type="text"
              placeholder="e.g. Rahul"
              value={contact}
              onChange={(e) =>
                setContact(e.target.value)
              }
            />

            <label>
              What happened?
            </label>

            <textarea
              placeholder="e.g. Rahul prefers quarterly billing and is concerned about API security."
              value={interaction}
              onChange={(e) =>
                setInteraction(e.target.value)
              }
            />

            <button
              type="button"
              className="primary-button"
              onClick={rememberInteraction}
              disabled={
                saving || recalling
              }
            >
              {saving
                ? "Saving..."
                : "🧠 Remember This"}
            </button>

            {memoryStatus && (
              <div className="status-message">
                {memoryStatus}
              </div>
            )}

          </div>

          {/* MEETING PREPARATION */}

          <div className="card prepare-card">

            <div className="card-header">

              <div>

                <h3>
                  📋 Prepare My Meeting
                </h3>

                <p>
                  Recall everything MeetingMind
                  knows about this contact.
                </p>

              </div>

            </div>

            <div className="contact-preview">

              <div className="avatar">

                {contact
                  ? contact
                      .charAt(0)
                      .toUpperCase()
                  : "?"}

              </div>

              <div>

                <span>
                  MEETING WITH
                </span>

                <strong>
                  {contact ||
                    "Choose a contact"}
                </strong>

              </div>

            </div>

            <button
              type="button"
              className="prepare-button"
              onClick={prepareMeeting}
              disabled={
                saving ||
                recalling ||
                !contact.trim()
              }
            >
              {recalling
                ? "Recalling memories..."
                : "✨ Generate Meeting Brief"}
            </button>

          </div>

        </section>

        {/* MEETING BRIEF */}

        {memories !== null && (

          <section className="brief-section">

            <div className="brief-title">

              <div>

                <span className="section-label">
                  MEMORY RECALL
                </span>

                <h2>
                  Meeting Brief for {contact}
                </h2>

                <p>
                  Built from information remembered
                  across previous interactions.
                </p>

              </div>

              <div className="memory-count">
                🧠 {processedMemories.length}
                {" "}memories recalled
              </div>

            </div>

            {processedMemories.length === 0 ? (

              <div className="empty-state">
                No memories found for this
                contact yet.
              </div>

            ) : (

              <div className="brief-grid">

                {/* PREFERENCES */}

                {preferences.length > 0 && (

                  <div className="brief-card">

                    <div className="brief-card-title">

                      <span>💡</span>

                      <h3>
                        Preferences
                      </h3>

                    </div>

                    {preferences.map(
                      (memory, index) => (

                        <div
                          className="brief-item"
                          key={`preference-${index}`}
                        >

                          <span>•</span>

                          <p>
                            {memory.text}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                )}

                {/* CONCERNS */}

                {concerns.length > 0 && (

                  <div className="brief-card">

                    <div className="brief-card-title">

                      <span>⚠️</span>

                      <h3>
                        Concerns
                      </h3>

                    </div>

                    {concerns.map(
                      (memory, index) => (

                        <div
                          className="brief-item"
                          key={`concern-${index}`}
                        >

                          <span>•</span>

                          <p>
                            {memory.text}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                )}

                {/* COMMITMENTS */}

                {commitments.length > 0 && (

                  <div className="brief-card">

                    <div className="brief-card-title">

                      <span>📌</span>

                      <h3>
                        Open Commitments
                      </h3>

                    </div>

                    {commitments.map(
                      (memory, index) => (

                        <div
                          className="brief-item"
                          key={`commitment-${index}`}
                        >

                          <span>•</span>

                          <p>
                            {memory.text}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                )}

                {/* PREVIOUS INTERACTIONS */}

                {interactions.length > 0 && (

                  <div className="brief-card">

                    <div className="brief-card-title">

                      <span>🕐</span>

                      <h3>
                        Previous Discussions
                      </h3>

                    </div>

                    {interactions
                      .slice(0, 4)
                      .map(
                        (memory, index) => (

                          <div
                            className="brief-item"
                            key={`interaction-${index}`}
                          >

                            <span>•</span>

                            <p>
                              {memory.text}
                            </p>

                          </div>

                        )
                      )}

                  </div>

                )}

                {/* TALKING POINTS */}

                <div className="brief-card talking-points">

                  <div className="brief-card-title">

                    <span>🎯</span>

                    <h3>
                      Suggested Talking Points
                    </h3>

                  </div>

                  {commitments.length > 0 && (

                    <div className="brief-item">

                      <span>1</span>

                      <p>
                        Follow up on the outstanding
                        commitment.
                      </p>

                    </div>

                  )}

                  {concerns.length > 0 && (

                    <div className="brief-item">

                      <span>2</span>

                      <p>
                        Address the concerns raised
                        in previous conversations.
                      </p>

                    </div>

                  )}

                  {preferences.length > 0 && (

                    <div className="brief-item">

                      <span>3</span>

                      <p>
                        Align the discussion with
                        {` `}
                        {contact}'s preferences.
                      </p>

                    </div>

                  )}

                  {commitments.length === 0 &&
                    concerns.length === 0 &&
                    preferences.length === 0 && (

                    <div className="brief-item">

                      <span>•</span>

                      <p>
                        Review previous discussions
                        before starting the meeting.
                      </p>

                    </div>

                  )}

                </div>

              </div>

            )}

          </section>

        )}

        {/* DIFFERENCE */}

        <section className="demo-story">

          <div>

            <span className="section-label">
              THE DIFFERENCE
            </span>

            <h2>

              Generic AI vs.
              <br />

              <span>
                Remembering AI
              </span>

            </h2>

          </div>

          <div className="comparison">

            <div className="comparison-box">

              <span>
                WITHOUT MEMORY
              </span>

              <p>
                "Here are some general questions
                you can ask during a business meeting."
              </p>

            </div>

            <div className="arrow">
              →
            </div>

            <div className="comparison-box highlighted">

              <span>
                WITH HINDSIGHT
              </span>

              <p>
                "Rahul previously raised API security
                concerns and prefers quarterly billing.
                Follow up on the security documentation
                before discussing pricing."
              </p>

            </div>

          </div>

        </section>

      </main>

      <footer>
        Built with ❤️ using React + Hindsight
      </footer>

    </div>
  );
}

export default App;