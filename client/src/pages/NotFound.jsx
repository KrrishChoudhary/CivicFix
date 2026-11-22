// client/src/pages/NotFound.jsx
// 404 Not Found Page

import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="page-container not-found-container">
      <h1 className="not-found-code">404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist or has been moved.</p>
      <Link to="/" className="btn btn-primary">
        Return to Home
      </Link>
    </div>
  );
};

export default NotFound;
