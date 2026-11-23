// client/src/pages/Home.jsx
// Redesigned Bengaluru-themed Home landing page with live issue stats, animated auto-rickshaw,
// "How it works" steps, and the iconic Bengaluru SkylineStrip.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import AutoRickshaw from "../components/illustrations/AutoRickshaw";
import SkylineStrip from "../components/illustrations/SkylineStrip";

const Home = () => {
  const [stats, setStats] = useState({ total: 0, resolved: 0, open: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const res = await api.get("/issues");
        const issues = res.data.issues || [];
        const resolved = issues.filter((i) => i.status === "resolved").length;
        const open = issues.length - resolved;

        if (isMounted) {
          setStats({
            total: issues.length,
            resolved,
            open,
          });
        }
      } catch (err) {
        console.warn("Could not load live issue stats:", err.message);
      } finally {
        if (isMounted) {
          setLoadingStats(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-page-container">
      {/* 1. Hero Section */}
      <section className="home-hero-card" aria-labelledby="hero-heading">
        <div className="hero-kannada-pill" title="Namma Bengaluru, Namma Fix">
          ನಮ್ಮ ಬೆಂಗಳೂರು, ನಮ್ಮ ಫಿಕ್ಸ್
        </div>
        <h1 id="hero-heading" className="hero-headline">
          Namma Bengaluru, <span>Namma Fix</span>
        </h1>
        <p className="hero-description">
          Spot a road crater on Outer Ring Road, overflowing garbage in Koramangala, or a dead streetlight in Indiranagar?
          Report it in seconds and track municipal resolution across Bengaluru wards.
        </p>

        <div className="hero-cta-buttons">
          <Link to="/map" className="btn btn-primary btn-lg">
            🗺️ View the Map
          </Link>
          <Link to="/report" className="btn btn-outline btn-lg">
            ✍️ Report an Issue
          </Link>
        </div>

        {/* Animated Auto-Rickshaw Driving across Road Line */}
        <div className="hero-road-container" aria-hidden="true">
          <div className="hero-auto-driver">
            <AutoRickshaw width={68} height={46} />
          </div>
          <div className="hero-road-line"></div>
        </div>
      </section>

      {/* 2. Live Bengaluru Civic Stats Strip */}
      <section className="live-stats-section" aria-label="Bengaluru Civic Statistics">
        <div className="stats-grid">
          {/* Stat 1: Total Reported */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-total-icon">📢</div>
            <div className="stat-content">
              {loadingStats ? (
                <div className="stat-skeleton"></div>
              ) : (
                <div className="stat-number">{stats.total}</div>
              )}
              <div className="stat-label">Issues Reported</div>
              <div className="stat-kannada-label">ದಾಖಲಾದ ದೂರುಗಳು</div>
            </div>
          </div>

          {/* Stat 2: Active / Still Open */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-open-icon">⚡</div>
            <div className="stat-content">
              {loadingStats ? (
                <div className="stat-skeleton"></div>
              ) : (
                <div className="stat-number">{stats.open}</div>
              )}
              <div className="stat-label">Still Open &amp; In-Progress</div>
              <div className="stat-kannada-label">ಪ್ರಗತಿಯಲ್ಲಿರುವ ಕಾಮಗಾರಿಗಳು</div>
            </div>
          </div>

          {/* Stat 3: Resolved */}
          <div className="stat-card">
            <div className="stat-icon-wrapper stat-resolved-icon">✅</div>
            <div className="stat-content">
              {loadingStats ? (
                <div className="stat-skeleton"></div>
              ) : (
                <div className="stat-number">{stats.resolved}</div>
              )}
              <div className="stat-label">Fixed &amp; Resolved</div>
              <div className="stat-kannada-label">ಪರಿಹರಿಸಲಾದ ಸಮಸ್ಯೆಗಳು</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "How it Works" Steps (Spot it, Pin it, Track it) */}
      <section className="how-it-works-section" aria-labelledby="how-it-works-heading">
        <div className="section-title-wrap">
          <h2 id="how-it-works-heading">How CivicFix Works</h2>
          <p className="section-subtitle">
            Three simple steps to make Bengaluru roads and neighborhoods cleaner, safer, and better.
          </p>
        </div>

        <div className="how-it-works-grid">
          {/* Step 1: Spot it */}
          <div className="step-card">
            <div className="step-badge">1</div>
            <div className="step-icon">👁️</div>
            <h3>Spot it</h3>
            <span className="step-kannada-tag">ಗುರುತಿಸಿ</span>
            <p>
              Notice an asphalt pothole, leaking water main, dark streetlight, or illegal waste dump during your commute.
            </p>
          </div>

          {/* Step 2: Pin it */}
          <div className="step-card">
            <div className="step-badge">2</div>
            <div className="step-icon">📍</div>
            <h3>Pin it</h3>
            <span className="step-kannada-tag">ಗುರುತು ಹಾಕಿ</span>
            <p>
              Drop an exact GPS pin on our Bengaluru map, choose the category, and optionally snap an on-site photo.
            </p>
          </div>

          {/* Step 3: Track it */}
          <div className="step-card">
            <div className="step-badge">3</div>
            <div className="step-icon">🚀</div>
            <h3>Track it</h3>
            <span className="step-kannada-tag">ಗಮನಿಸಿ</span>
            <p>
              Watch the status move transparently from Reported to Verified, In Progress, and officially Resolved by BBMP.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Bengaluru Skyline Decorative Footing */}
      <div className="home-skyline-footer" aria-hidden="true">
        <SkylineStrip height={95} />
      </div>
    </div>
  );
};

export default Home;
