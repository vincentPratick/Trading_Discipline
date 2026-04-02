import "./styles.css";

export default function App() {
  return (
    <div className="app-shell">
      <div className="container">
        {/* Header */}
        <div className="header">
          <div>
            <h1 className="title">Trading Discipline Dashboard</h1>
            <p className="subtitle">
              Stay disciplined, manage risk, and review every trade clearly.
            </p>
          </div>
          <button className="primary-btn">+ Add Trade</button>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="card">
            <div className="stat-label">Balance</div>
            <div className="stat-value">$930</div>
          </div>

          <div className="card">
            <div className="stat-label">Today P/L</div>
            <div className="stat-value">+$21.35</div>
          </div>

          <div className="card">
            <div className="stat-label">Win Rate</div>
            <div className="stat-value">66%</div>
          </div>

          <div className="card">
            <div className="stat-label">Discipline Score</div>
            <div className="stat-value">82/100</div>
          </div>
        </div>

        {/* Main */}
        <div className="main-grid">
          {/* Trade Form */}
          <div className="card">
            <h2 className="section-title">Trade Entry</h2>

            <div className="form-grid">
              <div className="input-group">
                <label className="label">Pair</label>
                <input className="input" type="text" placeholder="e.g. XAUUSD" />
              </div>

              <div className="input-group">
                <label className="label">Direction</label>
                <select className="select">
                  <option>Buy</option>
                  <option>Sell</option>
                </select>
              </div>

              <div className="input-group">
                <label className="label">Entry Price</label>
                <input className="input" type="number" placeholder="e.g. 4624" />
              </div>

              <div className="input-group">
                <label className="label">Stop Loss</label>
                <input className="input" type="number" placeholder="e.g. 4630" />
              </div>

              <div className="input-group">
                <label className="label">Take Profit</label>
                <input className="input" type="number" placeholder="e.g. 4602" />
              </div>

              <div className="input-group">
                <label className="label">Risk %</label>
                <input className="input" type="number" placeholder="e.g. 2" />
              </div>

              <div className="input-group full">
                <label className="label">Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Write your setup reason, emotion, and execution notes..."
                ></textarea>
              </div>

              <div className="input-group full">
                <button className="primary-btn">Save Trade</button>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="card">
            <h2 className="section-title">Rules Checklist</h2>

            <div className="checklist">
              <label className="check-item">
                <input type="checkbox" />
                Valid setup confirmed
              </label>

              <label className="check-item">
                <input type="checkbox" />
                Risk below 2%
              </label>

              <label className="check-item">
                <input type="checkbox" />
                No revenge trading
              </label>

              <label className="check-item">
                <input type="checkbox" />
                Entry matches plan
              </label>

              <label className="check-item">
                <input type="checkbox" />
                Stop loss already decided
              </label>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="card">
          <h2 className="section-title">Recent Trades</h2>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pair</th>
                  <th>Direction</th>
                  <th>Entry</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2026-04-02</td>
                  <td>XAUUSD</td>
                  <td>Sell</td>
                  <td>4624</td>
                  <td>+$21.35</td>
                </tr>
                <tr>
                  <td>2026-04-02</td>
                  <td>XAUUSD</td>
                  <td>Buy</td>
                  <td>4618</td>
                  <td>- $8.00</td>
                </tr>
                <tr>
                  <td>2026-04-01</td>
                  <td>XAUUSD</td>
                  <td>Sell</td>
                  <td>4598</td>
                  <td>+$12.50</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
