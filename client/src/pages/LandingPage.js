import React from "react";
import { Button } from "react-bootstrap";
import "./LandingPage.css";
import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div>
      <main className="landing-page-main">
        <section className="hero mb-0 pb-0 pt-5 landing-page-section">
          <h1 className="vertical-text mb-2">About Our App</h1>
          <p>
            The community app is designed to help people connect with their
            local community. Our app helps you connect with people in your local
            area, discover new events, and join local groups.
          </p>
        </section>

        <section className="about landing-page-section">
          <h1 className="vertical-text mb-2 pt-5">
            Connect with <br /> Your Community
          </h1>
          <p>
            With features such as event discovery, group creation, and community
            messaging, you can easily stay connected with the people and events
            in your area.
          </p>
        </section>

        <section className="features features-section">
          <div className="features-content">
            <h1 className="text-center mb-2 pt-5 vertical-text">Features</h1>
            <ul>
              <li>Event Discovery</li>
              <li>Group Creation</li>
              <li>Community Messaging</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="pt-1 m-0">
        <section className="call-to-action">
          <h2>Join Our Community</h2>
          <p>
            <Button as={Link} to="/register" className="signup-button">
              Sign Up
            </Button>{" "}
            today to start connecting with your local community.
          </p>
        </section>
        <p className="p-0 m-0">&copy; 2023 Local Community Web App</p>
      </footer>
    </div>
  );
}

export default LandingPage;
