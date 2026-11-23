// client/src/components/Footer.jsx
// Slim Bengaluru-themed footer with SkylineStrip and local tagline

import { Link } from "react-router-dom";
import SkylineStrip from "./illustrations/SkylineStrip";

const Footer = () => {
  return (
    <footer className="app-footer" aria-label="Site Footer">
      {/* Decorative Bengaluru Skyline Silhouette */}
      <div className="footer-skyline-container">
        <SkylineStrip height={60} />
      </div>

      <div className="footer-content-bar">
        <div className="footer-container">
          <div className="footer-left">
            <span className="footer-brand">
              Civic<span>Fix</span>
            </span>
            <span className="footer-divider">•</span>
            <span className="footer-kannada-tagline" title="Namma Bengaluru, Namma Fix">
              ನಮ್ಮ ಬೆಂಗಳೂರು, ನಮ್ಮ ಫಿಕ್ಸ್
            </span>
            <span className="footer-divider">•</span>
            <span className="footer-crafted-msg">
              Made with ☕ filter coffee in Bengaluru
            </span>
          </div>

          <nav className="footer-nav-links" aria-label="Footer Navigation">
            <Link to="/" className="footer-link">
              Home
            </Link>
            <Link to="/map" className="footer-link">
              Map
            </Link>
            <Link to="/report" className="footer-link">
              Report Issue
            </Link>
            <Link to="/dashboard" className="footer-link">
              Dashboard
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
