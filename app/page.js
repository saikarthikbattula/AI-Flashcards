"use client";
import { useCallback, useEffect, useState } from "react";
import Account from "./account";
import { deckSchema, sampleCards, review } from "../lib/cards";
const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
export default function Recall() {
  const [uid, setUid] = useState(null),
    [decks, setDecks] = useState([]),
    [notes, setNotes] = useState(""),
    [count, setCount] = useState(10),
    [active, setActive] = useState(null),
    [index, setIndex] = useState(0),
    [flipped, setFlipped] = useState(false),
    [progress, setProgress] = useState({}),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [pro, setPro] = useState(false);
  const onUser = useCallback((id) => setUid(id), []);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("recall-decks-v1") || "[]");
      setDecks(saved.filter((d) => deckSchema.safeParse(d).success));
      setProgress(
        JSON.parse(localStorage.getItem("recall-progress-v1") || "{}"),
      );
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("recall-decks-v1", JSON.stringify(decks));
        localStorage.setItem("recall-progress-v1", JSON.stringify(progress));
      } catch {
        setError("Browser storage is full. Export your decks before closing.");
      }
  }, [decks, progress, ready]);
  useEffect(() => {
    setPro(false);
    if (!uid) return;
    let current = true;
    api("/api/billing")
      .then((d) => {
        if (current) setPro(d.pro);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [uid]);
  async function api(path, body, method) {
    const r = await fetch(path, {
      method: method || (body ? "POST" : "GET"),
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    return d;
  }
  async function act(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function open(deck) {
    setActive(deck);
    setIndex(0);
    setFlipped(false);
  }
  async function generate(e) {
    e.preventDefault();
    await act(async () => {
      const d = await api("/api/generate", { notes, count: Number(count) });
      const deck = {
        id: crypto.randomUUID(),
        title: d.title,
        cards: d.cards,
        createdAt: new Date().toISOString(),
      };
      setDecks((prev) => [deck, ...prev]);
      open(deck);
      setNotice(
        d.mode === "demo"
          ? "Gemini is not configured. This is a sample deck, not a summary of your notes."
          : "Your Gemini deck is ready. Review generated facts against your notes.",
      );
    });
  }
  function exportDeck(deck) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "recall-deck.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importDeck(file) {
    if (!file) return;
    await act(async () => {
      if (file.size > 100000)
        throw new Error("Deck must be smaller than 100 KB.");
      const parsed = deckSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error("Choose a valid Recall deck export.");
      setDecks((prev) => [
        parsed.data,
        ...prev.filter((d) => d.id !== parsed.data.id),
      ]);
      open(parsed.data);
    });
  }
  function mark(known) {
    const key = `${active.id}:${index}`;
    setProgress((p) => review(p, key, known));
    setFlipped(false);
    setIndex((i) => (i + 1) % active.cards.length);
  }
  const current = active?.cards[index];
  return (
    <>
      <header>
        <a className="brand" href="/">
          <span>r</span>recall.
        </a>
        <div className="row">
          <span className="badge">
            {pro ? "Pro" : "Free · 10 cards per generation"}
          </span>
          {authEnabled && <Account onUser={onUser} />}
        </div>
      </header>
      <main id="main">
        <p className="eyebrow">Less rereading. More remembering.</p>
        <h1>
          Make knowledge
          <br />
          second nature.
        </h1>
        <p className="intro">
          Turn your notes into a deck worth coming back to. One idea, one card,
          one small win at a time.
        </p>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice">
            {notice}
          </p>
        )}
        <div className="columns">
          <section className="stack">
            {active ? (
              <div className="panel">
                <div className="row between">
                  <h2>{active.title}</h2>
                  <button
                    className="secondary small"
                    onClick={() => setActive(null)}
                  >
                    Close study
                  </button>
                </div>
                <div className="row between">
                  <p className="muted">
                    Card {index + 1} of {active.cards.length} ·{" "}
                    {flipped ? "Answer" : "Question"}
                  </p>
                  <small>
                    {progress[`${active.id}:${index}`]?.streak || 0} successful
                    reviews
                  </small>
                </div>
                <button
                  className="flashcard"
                  onClick={() => setFlipped((v) => !v)}
                  aria-label={flipped ? "Show question" : "Show answer"}
                >
                  {flipped ? current.back : current.front}
                </button>
                <p className="muted">
                  <small>
                    Tap the card to flip. After checking the answer, choose how
                    it went.
                  </small>
                </p>
                <div className="row">
                  <button
                    className="secondary"
                    disabled={!flipped}
                    onClick={() => mark(false)}
                  >
                    Practice again
                  </button>
                  <button disabled={!flipped} onClick={() => mark(true)}>
                    Got it →
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      setIndex((i) => (i + 1) % active.cards.length);
                      setFlipped(false);
                    }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel">
                <p className="eyebrow">Start with something you’re learning</p>
                <h2>A better way to study.</h2>
                <form onSubmit={generate} className="stack">
                  <label>
                    Your notes
                    <textarea
                      required
                      minLength={30}
                      maxLength={15000}
                      rows={8}
                      placeholder="Paste a paragraph, lecture notes, or a concept you want to remember…"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                  <label>
                    Cards per deck
                    <select
                      value={count}
                      onChange={(e) => setCount(e.target.value)}
                    >
                      {[3, 5, 10, ...(pro ? [20, 30] : [])].map((n) => (
                        <option key={n} value={n}>
                          {n} cards
                        </option>
                      ))}
                    </select>
                  </label>
                  <button disabled={busy || notes.trim().length < 30}>
                    {busy ? "Creating your deck…" : "Create flashcards ↗"}
                  </button>
                  <small className="muted">
                    Notes are sent to Gemini when configured. Without a key, you
                    get a clearly labeled sample deck.
                  </small>
                </form>
              </div>
            )}
            <div className="panel">
              <div className="row between">
                <h2>Your library</h2>
                <span className="badge">Saved in this browser</span>
              </div>
              <div className="row">
                <button
                  className="secondary small"
                  onClick={() => {
                    const deck = {
                      id: crypto.randomUUID(),
                      title: "Full-stack foundations",
                      cards: sampleCards,
                      createdAt: new Date().toISOString(),
                    };
                    setDecks((prev) => [deck, ...prev]);
                    open(deck);
                  }}
                >
                  Try a sample deck
                </button>
                <label>
                  Import deck
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => importDeck(e.target.files[0])}
                  />
                </label>
              </div>
              {decks.length === 0 ? (
                <p className="empty">
                  Your next “I remember this” moment starts with a deck.
                </p>
              ) : (
                decks.map((d) => (
                  <article className="item" key={d.id}>
                    <h3>{d.title}</h3>
                    <p className="muted">
                      {d.cards.length} cards ·{" "}
                      {
                        d.cards.filter(
                          (_, i) =>
                            (progress[`${d.id}:${i}`]?.due || 0) <= Date.now(),
                        ).length
                      }{" "}
                      due for practice
                    </p>
                    <div className="row">
                      <button className="small" onClick={() => open(d)}>
                        Study
                      </button>
                      <button
                        className="secondary small"
                        onClick={() => exportDeck(d)}
                      >
                        Export
                      </button>
                      <button
                        className="secondary small"
                        disabled={busy}
                        onClick={() => {
                          if (active?.id === d.id) setActive(null);
                          setDecks((prev) => prev.filter((x) => x.id !== d.id));
                        }}
                      >
                        Delete
                      </button>
                      {uid && (
                        <button
                          className="secondary small"
                          disabled={busy}
                          onClick={() =>
                            act(async () => {
                              await api("/api/decks", d);
                              setNotice("Deck saved to your cloud account.");
                            })
                          }
                        >
                          Save to cloud
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
              {uid && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const d = await api("/api/decks");
                      setDecks((prev) => [
                        ...d.decks,
                        ...prev.filter(
                          (x) => !d.decks.some((y) => y.id === x.id),
                        ),
                      ]);
                      setNotice("Cloud decks loaded into this browser.");
                    })
                  }
                >
                  Load cloud library
                </button>
              )}
            </div>
          </section>
          <aside className="stack" style={{ alignContent: "start" }}>
            <div className="panel">
              <p className="eyebrow">Room to grow</p>
              <h2>A little more recall.</h2>
              <p>
                Free: create up to 10 cards per generation, study, and export
                your decks.
              </p>
              <p>
                Pro: create up to 30 cards per generation. Sign in to save decks
                to your cloud account on either plan.
              </p>
              <button
                disabled={busy || !uid}
                onClick={() =>
                  act(async () => {
                    const d = await api(
                      pro ? "/api/billing" : "/api/checkout",
                      {},
                    );
                    location.assign(d.url);
                  })
                }
              >
                {pro ? "Manage billing" : "Upgrade with Stripe ↗"}
              </button>
              <p className="muted">
                <small>
                  {uid
                    ? "Stripe shows the configured plan price before purchase."
                    : "Sign in to access billing. Cloud accounts and Stripe need server configuration."}
                </small>
              </p>
            </div>
            <div className="notice">
              <strong>Practice a little, often.</strong>
              <p style={{ margin: 0 }}>
                “Got it” increases the next review interval. “Practice again”
                makes a card due immediately. Review progress stays in this
                browser.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <footer className="site-footer">
        Headstarter project 04 · Small sessions. Lasting understanding.
      </footer>
    </>
  );
}
