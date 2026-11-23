// client/src/pages/NotFound.jsx
// Fun Bengaluru-themed 404 page featuring Silk Board traffic and Auto-Rickshaw illustration

import { Link } from "react-router-dom";
import AutoRickshaw from "../components/illustrations/AutoRickshaw";

const NotFound = () => {
  return (
    <div className="page-container not-found-container">
      <div className="not-found-card">
        <div className="not-found-illustration">
          <AutoRickshaw width={110} height={75} />
        </div>

        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Lost like a tourist on Silk Board</h2>
        <p className="not-found-subtitle">
          Looks like you missed the flyover turn and ended up stuck in the junction traffic!
          Don&apos;t worry, our Namma auto will take you straight back home.
        </p>

        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary btn-lg">
            🛺 Return to Namma Home
          </Link>
          <Link to="/map" className="btn btn-outline btn-lg">
            🗺️ View Public Map
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
