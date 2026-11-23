// client/src/components/EmptyState.jsx
// Reusable Bengaluru-themed empty state component for lists, cards, and zero-filter results

import { Link } from "react-router-dom";
import FilterCoffee from "./illustrations/FilterCoffee";

const EmptyState = ({
  icon,
  title = "No issues here yet",
  message = "Time for a filter coffee.",
  actionLabel,
  actionTo,
  onAction,
  className = "",
}) => {
  return (
    <div className={`bengaluru-empty-state-card ${className}`}>
      <div className="empty-state-icon-wrapper">
        {icon ? icon : <FilterCoffee width={64} height={64} />}
      </div>

      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>

      {(actionLabel && (actionTo || onAction)) && (
        <div className="empty-state-action">
          {actionTo ? (
            <Link to={actionTo} className="btn btn-primary btn-sm">
              {actionLabel}
            </Link>
          ) : (
            <button type="button" onClick={onAction} className="btn btn-primary btn-sm">
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
