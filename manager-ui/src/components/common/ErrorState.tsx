// Reusable full-area error state (failed load + retry).
import { useTranslation } from 'react-i18next';
import './ErrorState.css';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
}: ErrorStateProps) {
  const { t } = useTranslation('common');

  return (
    <div className="error-state" role="alert">
      <svg
        className="error-state-icon"
        viewBox="0 0 24 24"
        width="48"
        height="48"
        aria-hidden="true"
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v5m0 3h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.42 0Z"
        />
      </svg>
      <h2 className="error-state-title">{title ?? t('error.title')}</h2>
      <p className="error-state-message">{message ?? t('error.body')}</p>
      {onRetry && (
        <button type="button" className="error-state-retry" onClick={onRetry}>
          {retryLabel ?? t('error.retry')}
        </button>
      )}
    </div>
  );
}
