import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";

const today = () => new Date().toISOString().slice(0, 10);
const normalizeDate = (s) => String(s || "").replaceAll("/", "-");
const fmt2 = (n) => Number(n || 0).toFixed(2);

const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const emptyTrade = {
  date: today(),
  pair: "XAUUSD",
  direction: "Buy",
  reason: "",
  entry: "",
  sl: "",
  tp: "",
  risk: "",
  result: "Win",
  pnl: "",
  h1: false,
  flip: false,
  sweep: false,
  choch: false,
  retest: false,
  noChase: true,
  noBigMove: true,
  noEmotion: true,
};

function scoreTrade(t) {
  return [t.h1, t.flip, t.sweep, t.choch, t.retest].filter(Boolean).length * 2;
}

function allowedTrade(t) {
  return scoreTrade(t) >= 8 && t.noChase && t.noBigMove && t.noEmotion;
}

function pnlClass(n) {
  const x = Number(n) || 0;
  if (x > 0) return "positive";
  if (x < 0) return "negative";
  return "";
}

export default function App() {
  const [tab, setTab] = useState("trade");
  const [startBalance, setStartBalance] = useState(() =>
    load("startBalance", "93")
  );
  const [trades, setTrades] = useState(() => load("trades", []));
  const [cashflows, setCashflows] = useState(() => load("cashflows", []));
  const [trade, setTrade] = useState(() => load("draftTrade", emptyTrade));
  const [flow, setFlow] = useState({
    date: today(),
    type: "Deposit",
    amount: "",
    note: "",
  });

  useEffect(() => save("startBalance", startBalance), [startBalance]);
  useEffect(() => save("trades", trades), [trades]);
  useEffect(() => save("cashflows", cashflows), [cashflows]);
  useEffect(() => save("draftTrade", trade), [trade]);

  const score = scoreTrade(trade);
  const canTrade = allowedTrade(trade);

  const stats = useMemo(() => {
    const tradePnl = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0);
    const flowPnl = cashflows.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const total = trades.length;
    const wins = trades.filter((t) => t.result === "Win").length;
    const winRate = total ? Math.round((wins / total) * 100) : 0;
    const currentBalance = (Number(startBalance) || 0) + tradePnl + flowPnl;
    const todayPnl = trades
      .filter((t) => normalizeDate(t.date) === normalizeDate(today()))
      .reduce((s, t) => s + (Number(t.pnl) || 0), 0);

    return {
      tradePnl,
      flowPnl,
      total,
      wins,
      winRate,
      currentBalance,
      todayPnl,
    };
  }, [trades, cashflows, startBalance]);

  const dailyRows = useMemo(() => {
    const map = {};
    for (const t of trades) {
      const d = normalizeDate(t.date);
      if (!map[d]) map[d] = { date: d, pnl: 0, count: 0 };
      map[d].pnl += Number(t.pnl) || 0;
      map[d].count += 1;
    }
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [trades]);

  const addTrade = () => {
    if (!trade.reason.trim()) {
      alert("Write the reason first.");
      return;
    }

    const raw = Math.abs(Number(trade.pnl) || 0);
    const finalPnl =
      trade.result === "Loss" ? -raw : trade.result === "BE" ? 0 : raw;

    const newTrade = {
      ...trade,
      id: Date.now(),
      date: normalizeDate(trade.date),
      score,
      allowed: canTrade,
      pnl: finalPnl,
    };

    setTrades([newTrade, ...trades]);
    setTrade({ ...emptyTrade, date: today(), pair: trade.pair || "XAUUSD" });
  };

  const deleteTrade = (id) => {
    setTrades(trades.filter((t) => t.id !== id));
  };

  const addFlow = () => {
    const raw = Math.abs(Number(flow.amount) || 0);
    if (!raw) {
      alert("Enter amount.");
      return;
    }

    const signed = flow.type === "Withdrawal" ? -raw : raw;

    setCashflows([
      {
        ...flow,
        id: Date.now(),
        amount: signed,
        date: normalizeDate(flow.date),
      },
      ...cashflows,
    ]);

    setFlow({ date: today(), type: "Deposit", amount: "", note: "" });
  };

  const deleteFlow = (id) => {
    setCashflows(cashflows.filter((f) => f.id !== id));
  };

  const exportData = () => {
    const data = { startBalance, trades, cashflows };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trade-app-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setStartBalance(String(data.startBalance ?? "93"));
        setTrades(Array.isArray(data.trades) ? data.trades : []);
        setCashflows(Array.isArray(data.cashflows) ? data.cashflows : []);
        alert("Import success");
      } catch {
        alert("Import failed");
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const clearAll = () => {
    if (!window.confirm("Clear all data?")) return;
    if (!window.confirm("Final confirm: clear everything?")) return;

    setStartBalance("93");
    setTrades([]);
    setCashflows([]);
    setTrade({ ...emptyTrade, date: today() });

    localStorage.removeItem("startBalance");
    localStorage.removeItem("trades");
    localStorage.removeItem("cashflows");
    localStorage.removeItem("draftTrade");
  };

  const TradeCardsMobile = () => (
  <div className="trade-slider">
    {trades.length === 0 ? (
      <div className="empty-state">No trades yet.</div>
    ) : (
      trades.map((t) => (
        <div key={t.id} className="trade-bot-card">
          <div className="trade-bot-top">
            <div>
              <div className="trade-bot-pair">{t.pair || "XAUUSD"}</div>
              <div className="trade-bot-date">{normalizeDate(t.date)}</div>
            </div>

            <span
              className={`badge ${
                t.result === "Win"
                  ? "badge-win"
                  : t.result === "Loss"
                  ? "badge-loss"
                  : "badge-be"
              }`}
            >
              {t.result}
            </span>
          </div>

          <div className="trade-bot-line" />

          <div className="trade-bot-grid">
            <div className="trade-bot-item">
              <span className="trade-bot-label">Entry</span>
              <strong>{t.entry || "-"}</strong>
            </div>

            <div className="trade-bot-item">
              <span className="trade-bot-label">Direction</span>
              <strong>{t.direction || "-"}</strong>
            </div>

            <div className="trade-bot-item">
              <span className="trade-bot-label">SL / TP</span>
              <strong>
                {t.sl || "-"} / {t.tp || "-"}
              </strong>
            </div>

            <div className="trade-bot-item">
              <span className="trade-bot-label">Score</span>
              <strong>
                {t.score}/10 {t.allowed ? "✅" : "❌"}
              </strong>
            </div>
          </div>

          <div className="trade-bot-footer">
            <div>
              <div className="trade-bot-label">P/L</div>
              <div className={`trade-bot-pnl ${pnlClass(t.pnl)}`}>
                {Number(t.pnl) > 0 ? "+" : ""}
                {fmt2(t.pnl)}
              </div>
            </div>

            <button
              className="trade-bot-delete"
              onClick={() => deleteTrade(t.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))
    )}
  </div>
);

  const CashflowCardsMobile = () => (
    <div className="mobile-cards">
      {cashflows.length === 0 ? (
        <div className="empty-state">No cash flow yet.</div>
      ) : (
        cashflows.map((f) => (
          <div key={f.id} className="mobile-card">
            <div className="mobile-card-top">
              <strong>{f.type}</strong>
              <span className={`badge ${f.type === "Deposit" ? "badge-win" : "badge-loss"}`}>
                {f.type}
              </span>
            </div>
            <div className="mobile-card-row">
              <span>Date</span>
              <span>{normalizeDate(f.date)}</span>
            </div>
            <div className="mobile-card-row">
              <span>Amount</span>
              <span className={pnlClass(f.amount)}>
                {Number(f.amount) > 0 ? "+" : ""}
                {fmt2(f.amount)}
              </span>
            </div>
            <div className="mobile-card-row">
              <span>Note</span>
              <span>{f.note || "-"}</span>
            </div>
            <button className="danger-btn full-btn" onClick={() => deleteFlow(f.id)}>
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="app-shell">
      <div className="container">
        <div className="header">
          <div>
            <h1 className="title">Trading Discipline Dashboard</h1>
            <p className="subtitle">
              Stay disciplined, manage risk, and review every trade clearly.
            </p>
          </div>

          <div className="mobile-stack">
            <button className="primary-btn" onClick={() => setTab("trade")}>
              + Add Trade
            </button>

            <button className="primary-btn" onClick={exportData}>
              Export
            </button>

            <label className="primary-btn upload-btn">
              Import
              <input
                type="file"
                accept="application/json"
                onChange={importData}
                style={{ display: "none" }}
              />
            </label>

            <button className="danger-btn" onClick={clearAll}>
              Clear All
            </button>
          </div>
        </div>

        {tab === "trade" && (
          <>
            <div className="section-block">
              <div className="section-header">
                <h2 className="section-title">Account Overview</h2>
                <p className="section-desc">
                  Quick view of your account and performance.
                </p>
              </div>

              <div className="stats-grid">
                <div className="card">
                  <div className="stat-label">Current Balance</div>
                  <div
                    className={`stat-value ${pnlClass(
                      stats.currentBalance - Number(startBalance || 0)
                    )}`}
                  >
                    ${fmt2(stats.currentBalance)}
                  </div>
                </div>

                <div className="card">
                  <div className="stat-label">Today P/L</div>
                  <div className={`stat-value ${pnlClass(stats.todayPnl)}`}>
                    {stats.todayPnl > 0 ? "+" : ""}${fmt2(stats.todayPnl)}
                  </div>
                </div>

                <div className="card">
                  <div className="stat-label">Win Rate</div>
                  <div
                    className={`stat-value ${
                      stats.winRate > 50
                        ? "positive"
                        : stats.winRate < 50
                        ? "negative"
                        : ""
                    }`}
                  >
                    {stats.winRate}%
                  </div>
                </div>

                <div className="card">
                  <div className="stat-label">Discipline Score</div>
                  <div className={`stat-value ${canTrade ? "positive" : "negative"}`}>
                    {score}/10
                  </div>
                </div>
              </div>
            </div>

            <div className="section-block">
              <div className="section-header">
                <h2 className="section-title">Setup Status</h2>
                <p className="section-desc">
                  Check whether this setup is ready or should be skipped.
                </p>
              </div>

              <div className={`status-panel ${canTrade ? "status-ready" : "status-wait"}`}>
                <div className="status-main">
                  {canTrade ? "READY TO TRADE" : "WAIT / NO TRADE"}
                </div>
                <div className="status-sub">
                  Pair: {trade.pair} · Score: {score}/10 · Today P/L: ${fmt2(stats.todayPnl)}
                </div>
              </div>
            </div>

            <div className="section-block">
              <div className="section-header">
                <h2 className="section-title">Trade Planning</h2>
                <p className="section-desc">
                  Plan the trade first, then confirm the checklist.
                </p>
              </div>

              <div className="main-grid">
                <div className="card">
                  <h3 className="subsection-title">Trade Entry</h3>

                  <div className="form-grid">
                    <div className="input-group">
                      <label className="label">Start Balance</label>
                      <input
                        className="input"
                        value={startBalance}
                        onChange={(e) => setStartBalance(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">Trade Date</label>
                      <input
                        className="input"
                        type="date"
                        value={normalizeDate(trade.date)}
                        onChange={(e) =>
                          setTrade({
                            ...trade,
                            date: normalizeDate(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">Pair</label>
                      <input
                        className="input"
                        value={trade.pair}
                        onChange={(e) =>
                          setTrade({ ...trade, pair: e.target.value })
                        }
                        placeholder="e.g. XAUUSD"
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">Direction</label>
                      <select
                        className="select"
                        value={trade.direction}
                        onChange={(e) =>
                          setTrade({ ...trade, direction: e.target.value })
                        }
                      >
                        <option>Buy</option>
                        <option>Sell</option>
                      </select>
                    </div>

                    <div className="input-group full">
                      <label className="label">Reason</label>
                      <input
                        className="input"
                        value={trade.reason}
                        onChange={(e) =>
                          setTrade({ ...trade, reason: e.target.value })
                        }
                        placeholder="Write the setup reason"
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">Entry Price</label>
                      <input
                        className="input"
                        value={trade.entry}
                        onChange={(e) =>
                          setTrade({ ...trade, entry: e.target.value })
                        }
                        placeholder="e.g. 4624"
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">Stop Loss</label>
                      <input
                        className="input"
                        value={trade.sl}
                        onChange={(e) =>
                          setTrade({ ...trade, sl: e.target.value })
                        }
                        placeholder="e.g. 4630"
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">Take Profit</label>
                      <input
                        className="input"
                        value={trade.tp}
                        onChange={(e) =>
                          setTrade({ ...trade, tp: e.target.value })
                        }
                        placeholder="e.g. 4602"
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">Risk %</label>
                      <input
                        className="input"
                        value={trade.risk || ""}
                        onChange={(e) =>
                          setTrade({ ...trade, risk: e.target.value })
                        }
                        placeholder="e.g. 2"
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">PnL</label>
                      <input
                        className="input"
                        value={trade.pnl}
                        onChange={(e) =>
                          setTrade({ ...trade, pnl: e.target.value })
                        }
                        placeholder="e.g. 21.35"
                      />
                    </div>

                    <div className="input-group">
                      <label className="label">Result</label>
                      <select
                        className="select"
                        value={trade.result}
                        onChange={(e) =>
                          setTrade({ ...trade, result: e.target.value })
                        }
                      >
                        <option>Win</option>
                        <option>Loss</option>
                        <option>BE</option>
                      </select>
                    </div>

                    <div className="input-group full">
                      <button className="primary-btn full-btn" onClick={addTrade}>
                        Save Trade
                      </button>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="subsection-title">Rules Checklist</h3>

                  <div className="checklist">
                    <label className="check-item">
                      <input
                        type="checkbox"
                        checked={trade.h1}
                        onChange={() => setTrade({ ...trade, h1: !trade.h1 })}
                      />
                      H1 direction clear
                    </label>

                    <label className="check-item">
                      <input
                        type="checkbox"
                        checked={trade.flip}
                        onChange={() => setTrade({ ...trade, flip: !trade.flip })}
                      />
                      Flip zone reached
                    </label>

                    <label className="check-item">
                      <input
                        type="checkbox"
                        checked={trade.sweep}
                        onChange={() =>
                          setTrade({ ...trade, sweep: !trade.sweep })
                        }
                      />
                      Liquidity sweep
                    </label>

                    <label className="check-item">
                      <input
                        type="checkbox"
                        checked={trade.choch}
                        onChange={() =>
                          setTrade({ ...trade, choch: !trade.choch })
                        }
                      />
                      CHoCH break
                    </label>

                    <label className="check-item">
                      <input
                        type="checkbox"
                        checked={trade.retest}
                        onChange={() =>
                          setTrade({ ...trade, retest: !trade.retest })
                        }
                      />
                      Retest confirmed
                    </label>

                    <label className="check-item">
                      <input
                        type="checkbox"
                        checked={trade.noChase}
                        onChange={() =>
                          setTrade({ ...trade, noChase: !trade.noChase })
                        }
                      />
                      No no-retest entry
                    </label>

                    <label className="check-item">
                      <input
                        type="checkbox"
                        checked={trade.noBigMove}
                        onChange={() =>
                          setTrade({ ...trade, noBigMove: !trade.noBigMove })
                        }
                      />
                      No chasing big move
                    </label>

                    <label className="check-item">
                      <input
                        type="checkbox"
                        checked={trade.noEmotion}
                        onChange={() =>
                          setTrade({ ...trade, noEmotion: !trade.noEmotion })
                        }
                      />
                      No emotional trade
                    </label>
                  </div>

                  <div className={`mini-status ${canTrade ? "status-ready" : "status-wait"}`}>
                    Score: {score}/10 · {canTrade ? "Can trade" : "No trade"}
                  </div>
                </div>
              </div>
            </div>

          
          </>
        )}


        {tab === "daily" && (
          <>
            <div className="section-block">
              <div className="section-header">
                <h2 className="section-title">Daily Performance</h2>
                <p className="section-desc">
                  Review your trading results day by day.
                </p>
              </div>

              <div className="stats-grid">
                <div className="card">
                  <div className="stat-label">Today P/L</div>
                  <div className={`stat-value ${pnlClass(stats.todayPnl)}`}>
                    {stats.todayPnl > 0 ? "+" : ""}${fmt2(stats.todayPnl)}
                  </div>
                </div>

                <div className="card">
                  <div className="stat-label">Total Trades</div>
                  <div className="stat-value">{stats.total}</div>
                </div>

                <div className="card">
                  <div className="stat-label">Wins</div>
                  <div className="stat-value positive">{stats.wins}</div>
                </div>

                <div className="card">
                  <div className="stat-label">Win Rate</div>
                  <div
                    className={`stat-value ${
                      stats.winRate > 50
                        ? "positive"
                        : stats.winRate < 50
                        ? "negative"
                        : ""
                    }`}
                  >
                    {stats.winRate}%
                  </div>
                </div>
              </div>
            </div>

            <div className="section-block">
              <div className="section-header">
                <h2 className="section-title">Daily Summary</h2>
                <p className="section-desc">
                  See how many trades were taken and how much was made or lost each day.
                </p>
              </div>

              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Trades</th>
                        <th>P/L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.length === 0 ? (
                        <tr>
                          <td colSpan="3">No daily data yet.</td>
                        </tr>
                      ) : (
                        dailyRows.map((r) => (
                          <tr key={r.date}>
                            <td>{r.date}</td>
                            <td>{r.count}</td>
                            <td className={pnlClass(r.pnl)}>
                              {Number(r.pnl) > 0 ? "+" : ""}
                              {fmt2(r.pnl)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
        {tab === "history" && (
  <>
    <div className="section-block">
      <div className="section-header">
        <h2 className="section-title">Trade History</h2>
        <p className="section-desc">
          Review all recorded trades in one dedicated section.
        </p>
      </div>

      <div className="stats-grid">
        <div className="card">
          <div className="stat-label">Total Trades</div>
          <div className="stat-value">{stats.total}</div>
        </div>

        <div className="card">
          <div className="stat-label">Wins</div>
          <div className="stat-value positive">{stats.wins}</div>
        </div>

        <div className="card">
          <div className="stat-label">Win Rate</div>
          <div
            className={`stat-value ${
              stats.winRate > 50 ? "positive" : stats.winRate < 50 ? "negative" : ""
            }`}
          >
            {stats.winRate}%
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Total P/L</div>
          <div className={`stat-value ${pnlClass(stats.tradePnl)}`}>
            {stats.tradePnl > 0 ? "+" : ""}${fmt2(stats.tradePnl)}
          </div>
        </div>
      </div>
    </div>

    <div className="section-block">
      <div className="section-header">
        <h2 className="section-title">All Trades</h2>
        <p className="section-desc">
          Check entries, results, discipline score, and remove wrong records.
        </p>
      </div>

      <div className="card desktop-only">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Pair</th>
                <th>Direction</th>
                <th>Entry</th>
                <th>SL</th>
                <th>TP</th>
                <th>Result</th>
                <th>P/L</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan="10">No trades yet.</td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr key={t.id}>
                    <td>{normalizeDate(t.date)}</td>
                    <td>{t.pair || "XAUUSD"}</td>
                    <td>{t.direction || "-"}</td>
                    <td>{t.entry || "-"}</td>
                    <td>{t.sl || "-"}</td>
                    <td>{t.tp || "-"}</td>
                    <td>{t.result}</td>
                    <td className={pnlClass(t.pnl)}>
                      {Number(t.pnl) > 0 ? "+" : ""}
                      {fmt2(t.pnl)}
                    </td>
                    <td>
                      {t.score}/10 {t.allowed ? "✅" : "❌"}
                    </td>
                    <td>
                      <button
                        className="danger-btn"
                        onClick={() => deleteTrade(t.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mobile-only">
        <TradeCardsMobile />
      </div>
    </div>
  </>
)}

        {tab === "balance" && (
          <>
            <div className="section-block">
              <div className="section-header">
                <h2 className="section-title">Balance Overview</h2>
                <p className="section-desc">
                  Track your balance, deposits, and withdrawals clearly.
                </p>
              </div>

              <div className="stats-grid">
                <div className="card">
                  <div className="stat-label">Start Balance</div>
                  <div className="stat-value">${fmt2(startBalance)}</div>
                </div>

                <div className="card">
                  <div className="stat-label">Trade P/L</div>
                  <div className={`stat-value ${pnlClass(stats.tradePnl)}`}>
                    {stats.tradePnl > 0 ? "+" : ""}${fmt2(stats.tradePnl)}
                  </div>
                </div>

                <div className="card">
                  <div className="stat-label">Cash Flow</div>
                  <div className={`stat-value ${pnlClass(stats.flowPnl)}`}>
                    {stats.flowPnl > 0 ? "+" : ""}${fmt2(stats.flowPnl)}
                  </div>
                </div>

                <div className="card">
                  <div
                    className={`stat-value ${pnlClass(
                      stats.currentBalance - Number(startBalance || 0)
                    )}`}
                  >
                    ${fmt2(stats.currentBalance)}
                  </div>
                  <div className="stat-label" style={{ marginTop: 8 }}>
                    Current Balance
                  </div>
                </div>
              </div>
            </div>

            <div className="section-block">
              <div className="section-header">
                <h2 className="section-title">Add Cash Flow</h2>
                <p className="section-desc">
                  Record deposits and withdrawals separately from trading results.
                </p>
              </div>

              <div className="card">
                <div className="form-grid">
                  <div className="input-group">
                    <label className="label">Date</label>
                    <input
                      className="input"
                      type="date"
                      value={normalizeDate(flow.date)}
                      onChange={(e) =>
                        setFlow({ ...flow, date: normalizeDate(e.target.value) })
                      }
                    />
                  </div>

                  <div className="input-group">
                    <label className="label">Type</label>
                    <select
                      className="select"
                      value={flow.type}
                      onChange={(e) =>
                        setFlow({ ...flow, type: e.target.value })
                      }
                    >
                      <option>Deposit</option>
                      <option>Withdrawal</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="label">Amount</label>
                    <input
                      className="input"
                      value={flow.amount}
                      onChange={(e) =>
                        setFlow({ ...flow, amount: e.target.value })
                      }
                      placeholder="e.g. 35"
                    />
                  </div>

                  <div className="input-group">
                    <label className="label">Note</label>
                    <input
                      className="input"
                      value={flow.note}
                      onChange={(e) =>
                        setFlow({ ...flow, note: e.target.value })
                      }
                      placeholder="Optional note"
                    />
                  </div>

                  <div className="input-group full">
                    <button className="primary-btn full-btn" onClick={addFlow}>
                      Add Cash Flow
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="section-block">
              <div className="section-header">
                <h2 className="section-title">Cash Flow History</h2>
                <p className="section-desc">
                  Review all deposits and withdrawals in one place.
                </p>
              </div>

              <div className="card desktop-only">
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Note</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashflows.length === 0 ? (
                        <tr>
                          <td colSpan="5">No cash flow yet.</td>
                        </tr>
                      ) : (
                        cashflows.map((f) => (
                          <tr key={f.id}>
                            <td>{normalizeDate(f.date)}</td>
                            <td>{f.type}</td>
                            <td className={pnlClass(f.amount)}>
                              {Number(f.amount) > 0 ? "+" : ""}
                              {fmt2(f.amount)}
                            </td>
                            <td>{f.note || "-"}</td>
                            <td>
                              <button
                                className="danger-btn"
                                onClick={() => deleteFlow(f.id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mobile-only">
                <CashflowCardsMobile />
              </div>
            </div>
          </>
        )}
      </div>
     <div className="bottom-nav">
    <button
      className={tab === "trade" ? "bottom-nav-item active" : "bottom-nav-item"}
      onClick={() => setTab("trade")}
    >
      <span>📈</span>
      <small>Trade</small>
    </button>

    <button
      className={tab === "history" ? "bottom-nav-item active" : "bottom-nav-item"}
      onClick={() => setTab("history")}
    >
      <span>🕘</span>
      <small>History</small>
    </button>

    <button
      className={tab === "balance" ? "bottom-nav-item active" : "bottom-nav-item"}
      onClick={() => setTab("balance")}
    >
      <span>💰</span>
      <small>Balance</small>
    </button>
  </div>
 </div>
  );
  
}
