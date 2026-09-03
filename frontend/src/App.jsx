import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:5000/api'

function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function formatDuration(value) {
  const numericValue = Number(value)

  if (value === null || value === undefined || Number.isNaN(numericValue)) {
    return '—'
  }

  if (numericValue < 60) {
    return `${formatNumber(numericValue)}s`
  }

  if (numericValue < 3600) {
    const minutes = Math.floor(numericValue / 60)
    const seconds = Math.round(numericValue % 60)

    if (seconds === 0) {
      return `${minutes}m`
    }

    return `${minutes}m ${seconds}s`
  }

  const hours = Math.floor(numericValue / 3600)
  const minutes = Math.floor((numericValue % 3600) / 60)
  const seconds = Math.round(numericValue % 60)

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`)
  if (seconds > 0 || (hours === 0 && minutes === 0)) parts.push(`${seconds}s`)

  return parts.join(' ')
}

function formatCurrency(value) {
  const number = Number(value) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(number)
}

function buildDashboardData(summary, rows) {
  if (!summary) return null

  const totalBoards = summary.totalRows || 0
  const passedBoards = summary.passedBoards || 0
  const failedBoards = summary.failedBoards || 0
  const untestedBoards = summary.untestedBoards || 0
  const passRate = summary.passRate ?? (totalBoards > 0 ? (passedBoards / totalBoards) * 100 : 0)
  const failRate = summary.failRate ?? (totalBoards > 0 ? (failedBoards / totalBoards) * 100 : 0)
  const untestedRate = summary.untestedRate ?? (totalBoards > 0 ? (untestedBoards / totalBoards) * 100 : 0)
  const coverageRate = summary.coverageRate ?? 100
  const uniqueFailureTests = summary.uniqueFailureTests || 0
  const firstTryValidatedRate = summary.firstTryValidatedRate ?? 0
  const firstTryValidatedBoards = summary.firstTryValidatedBoards ?? summary.uniquePassedBoards ?? 0
  const firstAttemptCards = summary.firstAttemptCards ?? summary.totalRows ?? 0
  const firstAttemptOkCards = summary.firstAttemptOkCards ?? firstTryValidatedBoards ?? 0
  const totalTestTime = summary.totalTestTime ?? 0
  const averageTestTime = summary.averageTestTime ?? 0
  const bestTestTime = summary.bestTestTime ?? 0
  const bestTestTimeCount = summary.bestTestTimeCount || 0
  const bestTestTimePercent = summary.bestTestTimePercent ?? 0
  const worstTestTime = summary.worstTestTime ?? 0
  const worstTestTimeCount = summary.worstTestTimeCount || 0
  const worstTestTimePercent = summary.worstTestTimePercent ?? 0
  const blankLineCount = summary.blankLineCount ?? 0
  const retestCount = summary.retestCount ?? 0
  const retestPassedCount = summary.retestPassedCount ?? 0
  const retestFailedCount = summary.retestFailedCount ?? 0
  const retestPassedRate = summary.retestPassedRate ?? 0
  const retestFailedRate = summary.retestFailedRate ?? 0
  const topValidationAttempts = Array.isArray(summary.topValidationAttempts)
    ? summary.topValidationAttempts
    : []
  const topAttemptCards = Array.isArray(summary.topAttemptCards)
    ? summary.topAttemptCards
    : []

  const failureBreakdown = Array.isArray(summary.failedTestBreakdown)
    ? summary.failedTestBreakdown
    : []

  const topProducts = failureBreakdown.length > 0
    ? failureBreakdown.map((item, index) => ({
        name: item.name,
        value: item.value,
        uniqueCards: item.uniqueCards || 0,
        cardFailures: item.cardFailures || {},
        pace: `${Math.max(1, Math.round((item.value / Math.max(failedBoards, 1)) * 100))}%`,
        color: ['#3b82f6', '#10b981', '#a78bfa', '#f59e0b', '#ef4444'][index] || '#3b82f6',
      }))
    : [
        { name: 'No failing test detected', value: 0, pace: '0%', color: '#94a3b8' },
      ]

  const uniquePassedBoards = summary.uniquePassedBoards ?? 0
  const uniqueFailedBoards = summary.uniqueFailedBoards ?? 0

  const stats = [
    { label: 'Cards tested', value: formatNumber(totalBoards), delta: `${Math.round(passRate)}% pass` },
    { label: 'Pass rate', value: `${Math.round(passRate)}%`, delta: `${formatNumber(passedBoards)} tests passed • ${formatNumber(uniquePassedBoards)} cards` },
    { label: 'Fail rate', value: `${Math.round(failRate)}%`, delta: `${formatNumber(failedBoards)} tests failed • ${formatNumber(uniqueFailedBoards)} cards` },
    { label: 'First-try pass (first-attempt OK cards)', value: `${Math.round(firstTryValidatedRate)}%`, delta: `${formatNumber(firstTryValidatedBoards)} / ${formatNumber(firstAttemptCards)} first-attempt cards` },
    { label: 'Total test time', value: formatDuration(totalTestTime), delta: `${formatNumber(totalBoards)} cards` },
    { label: 'Average test time', value: formatDuration(averageTestTime), delta: `${formatNumber(totalBoards)} cards` },
    { label: 'Best time', value: formatDuration(bestTestTime), delta: `${formatNumber(bestTestTimeCount)} cards / ${Math.round(bestTestTimePercent)}%` },
    { label: 'Worst time', value: formatDuration(worstTestTime), delta: `${formatNumber(worstTestTimeCount)} cards / ${Math.round(worstTestTimePercent)}%` },
    { label: 'Blank lines', value: formatNumber(blankLineCount), delta: 'empty CSV lines' },
  ]

  const operations = [
    { name: 'Retest passed', value: Math.min(100, Math.round(retestPassedRate)), tone: retestPassedCount > 0 ? 'ok' : 'neutral' },
    { name: 'Retest failed', value: Math.min(100, Math.round(retestFailedRate)), tone: retestFailedCount > 0 ? 'warn' : 'neutral' },
  ]

  const channelMix = [
    { name: 'Passed', value: Math.max(0, Math.round(passRate)), color: '#22c55e' },
    { name: 'Failed', value: Math.max(0, Math.round(failRate)), color: '#3b82f6' },
    { name: 'Untested', value: Math.max(0, Math.round(untestedRate)), color: '#f59e0b' },
  ]

  const statusRows = rows
    .filter((row) => String(row.NS || '').trim() !== '')
    .map((row) => String(row['Status Carte'] || '').trim().toUpperCase())
    .filter((status) => status === 'OK' || status === 'NOK' || status === 'FAIL')

  const batchSize = Math.max(1, Math.ceil(statusRows.length / 8))
  const healthPulse = []

  for (let index = 0; index < statusRows.length; index += batchSize) {
    const batch = statusRows.slice(index, index + batchSize)
    const passed = batch.filter((status) => status === 'OK').length
    const value = Math.round((passed / batch.length) * 100)
    healthPulse.push({
      value,
      passed,
      failed: batch.length - passed,
      label: `${index + 1}`,
      status: value >= 80 ? 'healthy' : value >= 60 ? 'warning' : 'risk',
    })
  }

  if (healthPulse.length === 0) {
    healthPulse.push({ value: 0, passed: 0, failed: 0, label: '—', status: 'risk' })
  }

  const overallHealth = Math.round(
    healthPulse.reduce((total, point) => total + point.value, 0) / healthPulse.length,
  )
  const currentTrendValue = overallHealth
  const currentTrendStatus = currentTrendValue >= 80 ? 'Healthy' : currentTrendValue >= 60 ? 'Warning' : 'Risk'

  const totalDistribution = channelMix.reduce((sum, channel) => sum + (Number(channel.value) || 0), 0)
  let chartCursor = 0
  const donutBackground = totalDistribution > 0
    ? `conic-gradient(${channelMix.map((channel) => {
        const start = chartCursor
        const end = chartCursor + (Number(channel.value) || 0)
        chartCursor = end
        return `${channel.color} ${start}% ${end}%`
      }).join(', ')})`
    : 'conic-gradient(#10b981 0% 100%)'

  const firstPassRate = Math.max(0, Math.min(100, firstTryValidatedRate))
  const requiresReworkRate = Math.max(0, 100 - firstPassRate)

  return {
    stats,
    topProducts,
    healthPulse,
    currentTrendValue,
    currentTrendStatus,
    channelMix,
    operations,
    totalRevenue: failedBoards,
    averageValue: passRate,
    highestValue: passedBoards,
    lowestValue: untestedBoards,
    donutBackground,
    donutCenterValue: Math.round(passRate),
    firstPassRate,
    requiresReworkRate,
    firstPassBoards: firstTryValidatedBoards,
    topValidationAttempts,
    topAttemptCards,
  }
}

function App() {
  const [file, setFile] = useState(null)
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState([])
  const [selectedFailureTest, setSelectedFailureTest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mongoStatus, setMongoStatus] = useState('Checking...')

  const dashboardData = useMemo(() => buildDashboardData(summary, rows), [summary, rows])

  useEffect(() => {
    setMongoStatus('Waiting for upload')
  }, [])

  useEffect(() => {
    if (!selectedFailureTest) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedFailureTest(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFailureTest])

  const handleUpload = async (event) => {
    event.preventDefault()

    if (!file) {
      setError('Choose a CSV file first.')
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed.')
      }

      setSummary(result.summary)
      setRows(result.rows || [])
      setMongoStatus(result.mongoConnected ? 'MongoDB connected' : 'Fallback mode')
      setFile(null)
      event.target.reset()
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setLoading(false)
    }
  }

  const visibleColumns = rows.length > 0 ? Object.keys(rows[0]) : []
  const hasData = Boolean(summary)

  if (!hasData) {
    return (
      <div className="dashboard-page landing-shell">
        <section className="upload-panel landing-panel">
          <form onSubmit={handleUpload} className="upload-form">
            <label className="upload-box">
              <input
                type="file"
                accept=".csv"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />

              <div className="upload-dropzone-content">
                <div className="upload-icon" aria-hidden="true">
                  <svg viewBox="0 0 64 64" role="img" aria-label="Upload icon">
                    <path d="M20 40.5h24c8.8 0 15.8-7.1 15.8-15.9 0-8.6-6.8-15.6-15.4-15.9C41.7 4.9 35.5 1 28.6 1 18.5 1 10.4 8.6 9.2 18.5 4 20.4 1 25.3 1 31c0 7.1 5.8 13 13 13h6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M32 21v23M22.5 30.5L32 21l9.5 9.5" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <div className="upload-text-block">
                  <span className="upload-main-text">{file ? file.name : 'Drag & drop files or Browse'}</span>
                  <span className="upload-sub-text">Supported formats: .CSV</span>
                </div>
              </div>
            </label>

            <button type="submit" disabled={loading || !file}>
              {loading ? 'Uploading...' : 'Upload CSV'}
            </button>
          </form>

          {error && <p className="error-text">{error}</p>}
        </section>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <section className="upload-panel compact-upload">
        <div>
          <p className="eyebrow">Data source</p>
          <h2>Upload CSV to refresh the dashboard</h2>
        </div>

        <form onSubmit={handleUpload} className="upload-form">
          <label className="upload-box">
            <input
              type="file"
              accept=".csv"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <span>{file ? file.name : 'Choose CSV file'}</span>
          </label>

          <button type="submit" disabled={loading || !file}>
            {loading ? 'Uploading...' : 'Upload & analyze'}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="stats-grid">
        {dashboardData.stats.map((card) => (
          <article className="stat-card" key={card.label}>
            <span className="card-label">{card.label}</span>
            <div className="stat-main">
              <strong>{card.value}</strong>
              <span className="trend up">{card.delta}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="panel product-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Failure analysis</span>
              <h3>Top failed tests</h3>
            </div>
          </div>

          <ul className="product-list">
            {dashboardData.topProducts.map((product) => (
              <li key={product.name}>
                <div className="product-info">
                  <span className="mini-bar" style={{ background: product.color }} />
                  <div className="product-details">
                    <span className="product-name">{product.name}</span>
                    <small className="unique-cards">{product.uniqueCards} unique card{product.uniqueCards !== 1 ? 's' : ''}</small>
                  </div>
                </div>
                <div className="product-meta">
                  <strong>{formatNumber(product.value)}</strong>
                  <small>{product.pace}</small>
                </div>
                {Object.keys(product.cardFailures).length > 0 && (
                  <div className="card-failures">
                    {Object.entries(product.cardFailures).slice(0, 3).map(([ns, count]) => (
                      <div key={ns} className="failure-detail">
                        <span className="failure-ns">{ns}</span>
                        <span className="failure-count">{count}x</span>
                      </div>
                    ))}
                    {Object.keys(product.cardFailures).length > 3 && (
                      <button
                        type="button"
                        className="failure-more"
                        onClick={() => setSelectedFailureTest(product)}
                      >
                        +{Object.keys(product.cardFailures).length - 3} more
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel sales-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Card summary</span>
              <h3>Card test summary</h3>
            </div>
          </div>

          <div className="sales-number-row">
            <strong>{formatNumber(dashboardData.totalRevenue)}</strong>
            <span className="trend up">{Math.round(dashboardData.averageValue)}%</span>
          </div>

          <div className="progress-block">
            <span>{Math.round(dashboardData.averageValue)}% pass rate</span>
            <div className="progress-bar">
              <span style={{ width: `${Math.min(100, dashboardData.averageValue)}%` }} />
            </div>
          </div>

          <div className="first-pass-block">
            <div className="first-pass-header">
              <span>First-pass yield</span>
              <strong>{Math.round(dashboardData.firstPassRate)}%</strong>
            </div>
            <div className="first-pass-bar">
              <span className="first-pass-good" style={{ width: `${Math.min(100, dashboardData.firstPassRate)}%` }} />
              <span className="first-pass-rework" style={{ width: `${Math.min(100, dashboardData.requiresReworkRate)}%` }} />
            </div>
            <small>{formatNumber(dashboardData.firstPassBoards)} first-attempt OK cards</small>
          </div>

          <div className="mini-stats">
            <div>
              <span>Passed</span>
              <strong>{formatNumber(dashboardData.highestValue)}</strong>
            </div>
            <div>
              <span>Untested</span>
              <strong>{formatNumber(dashboardData.lowestValue)}</strong>
            </div>
          </div>
        </article>

        <article className="panel donut-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Status split</span>
              <h3>Result distribution</h3>
            </div>
          </div>

          <div className="donut-wrap">
            <div className="donut-chart" style={{ background: dashboardData.donutBackground }}>
              <div className="donut-center">
                <strong>{dashboardData.donutCenterValue}%</strong>
                <span>passed</span>
              </div>
            </div>

            <ul className="legend-list">
              {dashboardData.channelMix.map((channel) => (
                <li key={channel.name}>
                  <span className="dot" style={{ background: channel.color }} />
                  <span>{channel.name}</span>
                  <strong>{channel.value}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="panel retry-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Attempt count</span>
              <h3>Top 10 cards with most attempts</h3>
            </div>
          </div>

          <ul className="retry-list">
            {dashboardData.topAttemptCards.length > 0 ? dashboardData.topAttemptCards.map((item) => (
              <li key={item.ns} className="retry-item">
                <span>{item.ns}</span>
                <strong>{item.attempts} attempts</strong>
              </li>
            )) : (
              <li className="retry-item empty-item">
                <span>No attempts recorded</span>
              </li>
            )}
          </ul>
        </article>

        <article className="panel trend-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Card health</span>
              <h3>Card health trend</h3>
            </div>
          </div>

          <div className="line-chart-wrap" aria-label="Card health pulse chart">
            <div className="trend-header">
              <div className="trend-total">
                <strong>{dashboardData.currentTrendValue}%</strong>
                <span>Overall health</span>
              </div>

              <span className={`status-badge ${dashboardData.currentTrendStatus.toLowerCase()}`}>
                {dashboardData.currentTrendStatus}
              </span>
            </div>

            <div className="pulse-chart" role="img" aria-label="Health pulse by recent batch">
              <div className="pulse-scale" aria-hidden="true"><span>100</span><span>50</span><span>0</span></div>
              <div className="pulse-grid">
                {[100, 50, 0].map((value) => <span key={value} style={{ bottom: `${value}%` }} />)}
                {dashboardData.healthPulse.map((point) => (
                  <div className="pulse-column" key={`pulse-${point.label}`}>
                    <div className="pulse-bar-track">
                      <div className={`pulse-bar ${point.status}`} style={{ height: `${Math.max(point.value, 5)}%` }}>
                        <span>{point.value}%</span>
                      </div>
                    </div>
                    <small>B{point.label}</small>
                    <em>{point.passed}/{point.passed + point.failed}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="pulse-legend">
              <span><i className="legend-ok" /> Healthy batch</span>
              <span><i className="legend-warn" /> Watch batch</span>
              <span><i className="legend-risk" /> Risk batch</span>
            </div>

          </div>
        </article>

        <article className="panel operations-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Retest Outcome</span>
              <h3>Health</h3>
            </div>
          </div>

          <div className="operations-list">
            {dashboardData.operations.map((item) => (
              <div key={item.name} className="op-item">
                <div className="op-row">
                  <span>{item.name}</span>
                  <strong>{item.value}%</strong>
                </div>
                <div className="op-bar">
                  <span style={{ width: `${item.value}%` }} className={item.tone} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel table-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Preview</span>
              <h3>Data table</h3>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {visibleColumns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 6).map((row, index) => (
                  <tr key={`${index}-${Object.values(row).join('-')}`}>
                    {visibleColumns.map((column) => (
                      <td key={`${column}-${index}`}>{row[column] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {selectedFailureTest && (
        <div className="failure-modal-backdrop" onClick={() => setSelectedFailureTest(null)}>
          <section
            className="failure-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="failure-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="failure-modal-header">
              <div>
                <span className="panel-label">Additional failed cards</span>
                <h3 id="failure-modal-title">{selectedFailureTest.name}</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Close failed cards window"
                onClick={() => setSelectedFailureTest(null)}
              >
                ×
              </button>
            </div>
            <div className="failure-modal-list">
              {Object.entries(selectedFailureTest.cardFailures).slice(3).map(([ns, count]) => (
                <div key={ns} className="failure-modal-item">
                  <span>{ns}</span>
                  <strong>{count}x</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
