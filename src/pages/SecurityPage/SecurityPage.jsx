import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Icon from '../../components/Icon';
import { useToast } from '../../components/Toast';
import {
  FINDING_SEVERITY_LABELS,
  listSecurityReviews,
  loadSecurityDataset,
  runBaselineReview,
  saveSecurityReview,
} from '../../modules/security';
import '../ModulePages.css';
import './SecurityPage.css';

const formatDateTime = (value) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const severityBadge = (severity) => {
  if (severity === 'fail') return 'module-badge module-badge--danger';
  if (severity === 'warn') return 'module-badge module-badge--warning';
  if (severity === 'info') return 'module-badge module-badge--info';
  return 'module-badge module-badge--success';
};

const severityIcon = (severity) => {
  if (severity === 'fail') return 'close';
  if (severity === 'warn') return 'shield';
  if (severity === 'info') return 'bell';
  return 'check';
};

export default function SecurityPage() {
  const { showError, showSuccess, showWarning } = useToast();
  const { user } = useSelector((state) => state.auth);

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [currentReview, setCurrentReview] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const [persistNote, setPersistNote] = useState('');
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');

  const load = useCallback(async (signal) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await loadSecurityDataset({ signal });
      setDataset(result);
    } catch (error) {
      if (error.name !== 'AbortError') setLoadError(error.message || 'Security metadata could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const records = await listSecurityReviews(user.uid);
      setHistory(records);
      setHistoryError('');
    } catch (error) {
      setHistoryError(error.message || 'Review history could not be loaded.');
    }
  }, [user?.uid]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const startReview = async () => {
    if (!dataset || reviewing) return;
    setReviewing(true);
    setPersistNote('');
    try {
      const review = runBaselineReview(dataset);
      setCurrentReview(review);
      try {
        await saveSecurityReview(review);
        await refreshHistory();
        showSuccess('Baseline review complete', 'Findings were recorded to your review history.');
      } catch (persistError) {
        setPersistNote(persistError.message || 'The review could not be saved.');
        showWarning('Review complete — history offline', 'Findings are shown below but could not be persisted.');
      }
    } catch (error) {
      showError('Review failed', error.message || 'The baseline review could not be completed.');
    } finally {
      setReviewing(false);
    }
  };

  const latestReview = currentReview || history[0] || null;

  const totals = useMemo(() => {
    if (!latestReview) return null;
    return latestReview.summary;
  }, [latestReview]);

  if (loading && !dataset) {
    return (
      <div className="module-page">
        <div className="module-loading" role="status">
          <span className="projects-loading__spinner" aria-hidden="true" />
          <p>Preparing the security baseline…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="module-page">
      <header className="module-hero">
        <div>
          <span className="module-hero__eyebrow"><Icon name="shield" size={13} /> Operate</span>
          <h1>Security center</h1>
          <p>
            A baseline review inspects the real workspace snapshot — credential exposure, dependency
            manifests, Firestore rules posture, and the environment inventory. No finding is assumed;
            each is measured.
          </p>
        </div>
        <div className="module-hero__actions">
          <button type="button" className="module-btn" onClick={() => load(undefined)} disabled={loading}>
            <Icon name="refresh" size={15} /> Refresh data
          </button>
          <button
            type="button"
            className="module-btn module-btn--primary"
            onClick={startReview}
            disabled={!dataset || reviewing}
          >
            <Icon name="shield" size={15} /> {reviewing ? 'Reviewing…' : 'Start baseline review'}
          </button>
        </div>
      </header>

      {loadError && (
        <div className="module-note" role="alert">
          <span><Icon name="shield" size={16} /></span>
          <p><strong>Metadata unavailable.</strong>{loadError}</p>
        </div>
      )}

      {persistNote && (
        <div className="module-note" role="status">
          <span><Icon name="clock" size={16} /></span>
          <p>
            <strong>History could not be updated.</strong>
            {persistNote} Findings above are still accurate for this snapshot.
          </p>
        </div>
      )}

      {latestReview ? (
        <>
          <section className="module-summary" aria-label="Latest review outcome">
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="clock" size={18} /></span>
              <p><strong>{formatDateTime(latestReview.reviewedAt)}</strong><small>Latest review</small></p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="checkCircle" size={18} /></span>
              <p><strong>{totals.pass}</strong><small>Passing checks</small></p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="bell" size={18} /></span>
              <p><strong>{totals.warn}</strong><small>Warnings</small></p>
            </div>
            <div className="module-stat">
              <span className="module-stat__icon"><Icon name="zap" size={18} /></span>
              <p><strong>{totals.fail}</strong><small>Failing checks</small></p>
            </div>
          </section>

          <section className="module-card">
            <div className="module-card__header">
              <div>
                <h2>Findings</h2>
                <p>Most urgent first — snapshot generated {formatDateTime(latestReview.generatedAt)}</p>
              </div>
            </div>
            <ul className="security-findings">
              {latestReview.findings.map((finding) => (
                <li key={finding.id}>
                  <span className={`security-findings__mark security-findings__mark--${finding.severity}`} aria-hidden="true">
                    <Icon name={severityIcon(finding.severity)} size={14} />
                  </span>
                  <div className="security-findings__body">
                    <div className="security-findings__title">
                      <strong>{finding.title}</strong>
                      <span className={severityBadge(finding.severity)}>{FINDING_SEVERITY_LABELS[finding.severity] || finding.severity}</span>
                    </div>
                    <p>{finding.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section className="module-card">
          <div className="module-empty">
            <span><Icon name="shield" size={22} /></span>
            <h3>No baseline review yet</h3>
            <p>
              Run the first baseline review to score this workspace across credential exposure,
              dependency pinning, Firestore rules posture, and environment inventory.
            </p>
            <button
              type="button"
              className="module-btn module-btn--primary"
              onClick={startReview}
              disabled={!dataset || reviewing}
            >
              <Icon name="shield" size={15} /> Start baseline review
            </button>
          </div>
        </section>
      )}

      <section className="module-card security-history">
        <div className="module-card__header">
          <div>
            <h2>Review history</h2>
            <p>Persisted baseline reviews for this workspace</p>
          </div>
        </div>
        {historyError ? (
          <div className="module-empty">
            <span><Icon name="clock" size={22} /></span>
            <h3>History unavailable</h3>
            <p>{historyError} Reviews still run against the live snapshot; reconnect to restore the audit trail.</p>
          </div>
        ) : history.length ? (
          <table className="module-table">
            <thead>
              <tr>
                <th scope="col">Reviewed</th>
                <th scope="col">Passing</th>
                <th scope="col">Info</th>
                <th scope="col">Warnings</th>
                <th scope="col">Failing</th>
              </tr>
            </thead>
            <tbody>
              {history.map((review) => (
                <tr key={review.id}>
                  <td><strong>{formatDateTime(review.reviewedAt)}</strong></td>
                  <td><span className="module-badge module-badge--success">{review.summary.pass}</span></td>
                  <td><span className="module-badge module-badge--info">{review.summary.info}</span></td>
                  <td><span className="module-badge module-badge--warning">{review.summary.warn}</span></td>
                  <td><span className="module-badge module-badge--danger">{review.summary.fail}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="module-empty">
            <span><Icon name="clock" size={22} /></span>
            <h3>No reviews recorded</h3>
            <p>Each completed baseline review is persisted here so posture changes stay auditable.</p>
          </div>
        )}
      </section>
    </div>
  );
}
