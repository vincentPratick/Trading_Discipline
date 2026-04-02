import React, { useEffect, useMemo, useState } from "react";

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
  reason: "",
  entry: "",
  sl: "",
  tp: "",
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

function pnlColor(n) {
  const x = Number(n) || 0;
  if (x > 0) return "#16a34a";
  if (x < 0) return "#dc2626";
  return "#e5e7eb";
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
    setTrades([
      {
        ...trade,
        id: Date.now(),
        score,
        allowed: canTrade,
        pnl: finalPnl,
        date: normalizeDate(trade.date),
      },
      ...trades,
    ]);
    setTrade({ ...emptyTrade, date: today() });
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

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <h1 style={styles.h1}>Trading Discipline App</h1>

        <div style={styles.topbar}>
          <button style={styles.btn} onClick={exportData}>
            Export
          </button>
          <label style={styles.btn}>
            Import
            <input
              type="file"
              accept="application/json"
              onChange={importData}
              style={{ display: "none" }}
            />
          </label>
          <button style={styles.btnDanger} onClick={clearAll}>
            Clear All
          </button>
        </div>

        <div style={styles.statusBar}>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>PAIR</span>
            <span style={styles.statusValue}>XAUUSD</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>SETUP</span>
            <span
              style={{
                ...styles.statusValue,
                color: canTrade ? "#22c55e" : "#ef4444",
              }}
            >
              {canTrade ? "READY" : "WAIT"}
            </span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>SCORE</span>
            <span style={styles.statusValue}>{score}/10</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>TODAY</span>
            <span
              style={{ ...styles.statusValue, color: pnlColor(stats.todayPnl) }}
            >
              {fmt2(stats.todayPnl)}
            </span>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.box}>
            <div style={styles.boxLabel}>Start Balance</div>
            <div style={styles.boxValue}>{fmt2(startBalance)}</div>
          </div>
          <div style={styles.box}>
            <div style={styles.boxLabel}>Today PnL</div>
            <div
              style={{ ...styles.boxValue, color: pnlColor(stats.todayPnl) }}
            >
              {fmt2(stats.todayPnl)}
            </div>
          </div>
          <div style={styles.box}>
            <div style={styles.boxLabel}>Total PnL</div>
            <div
              style={{ ...styles.boxValue, color: pnlColor(stats.tradePnl) }}
            >
              {fmt2(stats.tradePnl)}
            </div>
          </div>
          <div style={styles.box}>
            <div style={styles.boxLabel}>Current Balance</div>
            <div
              style={{
                ...styles.boxValue,
                color:
                  stats.currentBalance > Number(startBalance || 0)
                    ? "#16a34a"
                    : stats.currentBalance < Number(startBalance || 0)
                    ? "#dc2626"
                    : "#e5e7eb",
              }}
            >
              {fmt2(stats.currentBalance)}
            </div>
          </div>
          <div style={styles.box}>
            <div style={styles.boxLabel}>Win Rate</div>
            <div
              style={{
                ...styles.boxValue,
                color:
                  stats.winRate > 50
                    ? "#16a34a"
                    : stats.winRate < 50
                    ? "#dc2626"
                    : "#e5e7eb",
              }}
            >
              {stats.winRate}%
            </div>
          </div>
          <div style={styles.box}>
            <div style={styles.boxLabel}>Trades</div>
            <div style={styles.boxValue}>{stats.total}</div>
          </div>
        </div>

        <div style={styles.tabs}>
          <button
            style={tab === "trade" ? styles.tabOn : styles.tabOff}
            onClick={() => setTab("trade")}
          >
            Trade
          </button>
          <button
            style={tab === "daily" ? styles.tabOn : styles.tabOff}
            onClick={() => setTab("daily")}
          >
            Daily
          </button>
          <button
            style={tab === "balance" ? styles.tabOn : styles.tabOff}
            onClick={() => setTab("balance")}
          >
            Balance
          </button>
        </div>

        {tab === "trade" && (
          <div style={styles.card}>
            <div style={{ marginBottom: 10 }}>
              <div style={styles.label}>Start Balance</div>
              <input
                style={styles.input}
                value={startBalance}
                onChange={(e) => setStartBalance(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={styles.label}>Trade Date</div>
              <input
                type="date"
                style={styles.input}
                value={normalizeDate(trade.date)}
                onChange={(e) =>
                  setTrade({ ...trade, date: normalizeDate(e.target.value) })
                }
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={styles.label}>Reason</div>
              <input
                style={styles.input}
                value={trade.reason}
                onChange={(e) => setTrade({ ...trade, reason: e.target.value })}
              />
            </div>
            <div style={styles.row3}>
              <input
                style={styles.input}
                placeholder="Entry"
                value={trade.entry}
                onChange={(e) => setTrade({ ...trade, entry: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="SL"
                value={trade.sl}
                onChange={(e) => setTrade({ ...trade, sl: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="TP"
                value={trade.tp}
                onChange={(e) => setTrade({ ...trade, tp: e.target.value })}
              />
            </div>
            <div style={styles.row3}>
              <input
                style={styles.input}
                placeholder="Risk %"
                value={trade.risk}
                onChange={(e) => setTrade({ ...trade, risk: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="PnL"
                value={trade.pnl}
                onChange={(e) => setTrade({ ...trade, pnl: e.target.value })}
              />
              <select
                style={styles.input}
                value={trade.result}
                onChange={(e) => setTrade({ ...trade, result: e.target.value })}
              >
                <option>Win</option>
                <option>Loss</option>
                <option>BE</option>
              </select>
            </div>

            <div style={styles.checkWrap}>
              <label style={styles.check}>
                <span>H1 direction clear</span>
                <input
                  type="checkbox"
                  checked={trade.h1}
                  onChange={() => setTrade({ ...trade, h1: !trade.h1 })}
                />
              </label>
              <label style={styles.check}>
                <span>Flip zone reached</span>
                <input
                  type="checkbox"
                  checked={trade.flip}
                  onChange={() => setTrade({ ...trade, flip: !trade.flip })}
                />
              </label>
              <label style={styles.check}>
                <span>Liquidity sweep</span>
                <input
                  type="checkbox"
                  checked={trade.sweep}
                  onChange={() => setTrade({ ...trade, sweep: !trade.sweep })}
                />
              </label>
              <label style={styles.check}>
                <span>CHoCH break</span>
                <input
                  type="checkbox"
                  checked={trade.choch}
                  onChange={() => setTrade({ ...trade, choch: !trade.choch })}
                />
              </label>
              <label style={styles.check}>
                <span>Retest confirmed</span>
                <input
                  type="checkbox"
                  checked={trade.retest}
                  onChange={() => setTrade({ ...trade, retest: !trade.retest })}
                />
              </label>
              <label style={styles.check}>
                <span>No no-retest entry</span>
                <input
                  type="checkbox"
                  checked={trade.noChase}
                  onChange={() =>
                    setTrade({ ...trade, noChase: !trade.noChase })
                  }
                />
              </label>
              <label style={styles.check}>
                <span>No chasing big move</span>
                <input
                  type="checkbox"
                  checked={trade.noBigMove}
                  onChange={() =>
                    setTrade({ ...trade, noBigMove: !trade.noBigMove })
                  }
                />
              </label>
              <label style={styles.check}>
                <span>No emotional trade</span>
                <input
                  type="checkbox"
                  checked={trade.noEmotion}
                  onChange={() =>
                    setTrade({ ...trade, noEmotion: !trade.noEmotion })
                  }
                />
              </label>
            </div>

            <div style={canTrade ? styles.okBox : styles.badBox}>
              Score: {score}/10 · {canTrade ? "Can trade" : "No trade"}
            </div>

            <button style={styles.mainBtn} onClick={addTrade}>
              Record Trade
            </button>

            <h3 style={styles.h3}>History</h3>
            {trades.map((t) => (
              <div
                key={t.id}
                style={
                  t.result === "Win"
                    ? styles.winCard
                    : t.result === "Loss"
                    ? styles.lossCard
                    : styles.tradeCard
                }
              >
                <div style={styles.between}>
                  <strong>XAUUSD</strong>
                  <strong
                    style={{
                      color:
                        t.result === "Win"
                          ? "#0891b2"
                          : t.result === "Loss"
                          ? "#dc2626"
                          : "#e5e7eb",
                    }}
                  >
                    {t.result}
                  </strong>
                </div>
                <div style={styles.small}>Date: {normalizeDate(t.date)}</div>
                <div style={styles.small}>Reason: {t.reason}</div>
                <div style={styles.small}>
                  Entry / SL / TP: {t.entry || "-"} / {t.sl || "-"} /{" "}
                  {t.tp || "-"}
                </div>
                <div
                  style={{
                    ...styles.small,
                    color: pnlColor(t.pnl),
                    fontWeight: 700,
                  }}
                >
                  PnL: {fmt2(t.pnl)}
                </div>
                <div style={styles.small}>
                  Score: {t.score}/10 {t.allowed ? "✅" : "❌"}
                </div>
                <button
                  style={styles.deleteBtn}
                  onClick={() => setTrades(trades.filter((x) => x.id !== t.id))}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "daily" && (
          <div style={styles.card}>
            <h3 style={styles.h3}>Daily Summary</h3>
            {dailyRows.map((r) => (
              <div key={r.date} style={styles.tradeCard}>
                <div style={styles.between}>
                  <strong>{r.date}</strong>
                  <strong style={{ color: pnlColor(r.pnl) }}>
                    {fmt2(r.pnl)}
                  </strong>
                </div>
                <div style={styles.small}>Trades: {r.count}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "balance" && (
          <div style={styles.card}>
            <div style={{ marginBottom: 10 }}>
              <div style={styles.label}>Date</div>
              <input
                type="date"
                style={styles.input}
                value={normalizeDate(flow.date)}
                onChange={(e) =>
                  setFlow({ ...flow, date: normalizeDate(e.target.value) })
                }
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={styles.label}>Type</div>
              <select
                style={styles.input}
                value={flow.type}
                onChange={(e) => setFlow({ ...flow, type: e.target.value })}
              >
                <option>Deposit</option>
                <option>Withdrawal</option>
              </select>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={styles.label}>Amount</div>
              <input
                style={styles.input}
                value={flow.amount}
                onChange={(e) => setFlow({ ...flow, amount: e.target.value })}
              />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={styles.label}>Note</div>
              <input
                style={styles.input}
                value={flow.note}
                onChange={(e) => setFlow({ ...flow, note: e.target.value })}
              />
            </div>
            <button style={styles.mainBtn} onClick={addFlow}>
              Add Cash Flow
            </button>

            <h3 style={styles.h3}>Cash Flow History</h3>
            {cashflows.map((f) => (
              <div key={f.id} style={styles.tradeCard}>
                <div style={styles.between}>
                  <strong>{f.type}</strong>
                  <strong style={{ color: pnlColor(f.amount) }}>
                    {fmt2(f.amount)}
                  </strong>
                </div>
                <div style={styles.small}>{normalizeDate(f.date)}</div>
                <div style={styles.small}>{f.note || "-"}</div>
                <button
                  style={styles.deleteBtn}
                  onClick={() =>
                    setCashflows(cashflows.filter((x) => x.id !== f.id))
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0b1220",
    padding: 16,
    fontFamily: "Arial, sans-serif",
    color: "#e5e7eb",
  },
  wrap: {
    maxWidth: 980,
    margin: "0 auto",
  },
  h1: {
    margin: 0,
    marginBottom: 12,
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: 700,
  },
  h3: {
    marginTop: 20,
    color: "#f8fafc",
  },
  topbar: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  btn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#111827",
    color: "#e5e7eb",
    cursor: "pointer",
  },
  btnDanger: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #7f1d1d",
    background: "#2a1116",
    color: "#fca5a5",
    cursor: "pointer",
  },
  statusBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginBottom: 12,
  },
  statusItem: {
    background: "#0f172a",
    border: "1px solid #273449",
    borderRadius: 14,
    padding: "10px 12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 8px 24px rgba(0,0,0,0.22)",
  },
  statusLabel: {
    fontSize: 11,
    color: "#94a3b8",
    letterSpacing: "0.08em",
    fontWeight: 700,
  },
  statusValue: {
    fontSize: 14,
    color: "#f8fafc",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
    marginBottom: 12,
  },
  box: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 14,
    textAlign: "center",
    boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
  },
  boxLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  boxValue: {
    fontSize: 22,
    fontWeight: 700,
    marginTop: 6,
    color: "#f8fafc",
  },
  tabs: {
    display: "flex",
    gap: 8,
    marginBottom: 12,
  },
  tabOn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #38bdf8",
    background: "#082f49",
    color: "#e0f2fe",
    cursor: "pointer",
    boxShadow: "0 0 0 1px rgba(56,189,248,0.15) inset",
  },
  tabOff: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#111827",
    color: "#cbd5e1",
    cursor: "pointer",
  },
  card: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
  label: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 11,
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#f8fafc",
    outline: "none",
  },
  row3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
    marginBottom: 10,
  },
  checkWrap: {
    display: "grid",
    gap: 8,
    marginTop: 10,
  },
  check: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #273449",
    background: "#0f172a",
    borderRadius: 12,
    padding: 11,
    color: "#e5e7eb",
  },
  okBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: 14,
    background: "#052e2b",
    border: "1px solid #0f766e",
    color: "#99f6e4",
    fontWeight: 600,
  },
  badBox: {
    marginTop: 12,
    padding: 13,
    borderRadius: 14,
    background: "#3f1117",
    border: "1px solid #7f1d1d",
    color: "#fecaca",
    fontWeight: 600,
  },
  mainBtn: {
    marginTop: 14,
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #1d4ed8",
    background: "#1d4ed8",
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },
  tradeCard: {
    border: "1px solid #253244",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },
  winCard: {
    border: "1px solid #155e75",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    background: "linear-gradient(180deg, #082f49 0%, #0f172a 100%)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
  },
  lossCard: {
    border: "1px solid #7f1d1d",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    background: "linear-gradient(180deg, #3f1117 0%, #0f172a 100%)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
  },
  between: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  small: {
    marginTop: 7,
    fontSize: 14,
    color: "#cbd5e1",
  },
  deleteBtn: {
    marginTop: 12,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #7f1d1d",
    background: "#2a1116",
    color: "#fca5a5",
    cursor: "pointer",
  },
};
