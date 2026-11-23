// client/src/components/Loader.jsx
// Reusable Bengaluru-themed loader with animated auto-rickshaw and rotating local messages

import { useState, useEffect } from "react";
import AutoRickshaw from "./illustrations/AutoRickshaw";

const BENGALURU_MESSAGES = [
  "Brewing your filter coffee...",
  "Dodging Silk Board traffic...",
  "Waiting for the BMTC bus...",
  "Navigating the Outer Ring Road...",
  "Reaching the ward engineer...",
];

const Loader = ({ message, className = "", minHeight = "220px" }) => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (message) return; // If custom static message provided, no need to rotate

    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % BENGALURU_MESSAGES.length);
    }, 2400);

    return () => clearInterval(timer);
  }, [message]);

  const activeMessage = message || BENGALURU_MESSAGES[msgIndex];

  return (
    <div
      className={`bengaluru-loader-container ${className}`}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
    >
      <div className="loader-track">
        <div className="loader-auto-bounce">
          <AutoRickshaw width={64} height={45} />
        </div>
        <div className="loader-road-line"></div>
      </div>

      <p className="loader-message-text" key={activeMessage}>
        {activeMessage}
      </p>
    </div>
  );
};

export default Loader;
