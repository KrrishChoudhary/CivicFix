// client/src/components/StatusBadge.jsx
// Reusable status badge with human-readable labels and color-coded styling

const STATUS_CONFIG = {
  reported: {
    label: "Reported",
    className: "status-badge status-reported",
  },
  verified: {
    label: "Verified",
    className: "status-badge status-verified",
  },
  in_progress: {
    label: "In Progress",
    className: "status-badge status-in-progress",
  },
  resolved: {
    label: "Resolved",
    className: "status-badge status-resolved",
  },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    className: "status-badge status-unknown",
  };

  return <span className={config.className}>{config.label}</span>;
};

export default StatusBadge;
