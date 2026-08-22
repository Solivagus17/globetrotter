import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import {
  IconCompass,
  IconMap,
  IconSparkles,
  IconWallet,
  IconCalendar,
  IconStar,
  IconPin,
  IconBed,
  IconUtensils,
  IconPlane,
  IconLandmark,
  IconSearch,
  IconBookmark,
} from '../components/Icons'

export default function LandingPage() {
  const [session, setSession] = useState(null)
  const [searchCity, setSearchCity] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
  }, [])

  function handleQuickSearch(e) {
    e.preventDefault()
    if (searchCity.trim()) {
      if (session) {
        navigate(`/discover?city=${encodeURIComponent(searchCity.trim())}`)
      } else {
        navigate(`/login?redirect=/discover?city=${encodeURIComponent(searchCity.trim())}`)
      }
    } else {
      navigate(session ? '/trips/new' : '/login')
    }
  }

  return (
    <div className="landing-page-root">
      {/* Ambient Animated Background Lighting */}
      <div className="landing-ambient-bg" aria-hidden="true">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
        <div className="ambient-orb orb-4" />
      </div>

      {/* 1. Header / Navigation */}
      <header className="landing-nav-header">
        <div className="landing-nav-container">
          <Link to="/" className="landing-brand">
            <span className="brand-logo-icon">GT</span>
            <span className="brand-text">GlobeTrotter</span>
          </Link>

          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#destinations">Destinations</a>
            <a href="#voyage-ai">Voyage AI</a>
            <Link to="/admin">Platform Stats</Link>
          </nav>

          <div className="landing-nav-actions">
            {session ? (
              <Link to="/trips" className="btn primary-glow-btn">
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn secondary small">
                  Sign In
                </Link>
                <Link to="/login?mode=signup" className="btn primary-glow-btn small">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="landing-hero-section">
        <div className="landing-hero-container">
          <div className="landing-hero-content reveal">
            <div className="hero-pill-badge">
              <IconSparkles size={14} />
              <span>Next-Gen Travel Planning & AI Concierge</span>
            </div>

            <h1 className="hero-headline">
              Plan Multi-City Journeys <br />
              <span className="hero-gradient-text">Without The Chaos.</span>
            </h1>

            <p className="hero-subtitle">
              Turn messy spreadsheets into structured, day-by-day itineraries with real-time budget telemetry, intelligent route maps, AI discovery, and magazine-grade PDF booklets.
            </p>

            {/* Quick Trip Launch Search Box */}
            <form onSubmit={handleQuickSearch} className="hero-search-bar">
              <div className="search-field-wrap">
                <IconSearch size={18} className="search-icon-dim" />
                <input
                  type="text"
                  placeholder="Where do you want to travel? (e.g. Paris, Tokyo, Goa)"
                  value={searchCity}
                  onChange={e => setSearchCity(e.target.value)}
                />
              </div>

              <button type="submit" className="btn hero-search-btn">
                {session ? 'Plan Itinerary →' : 'Start Planning Free →'}
              </button>
            </form>

            <div className="hero-features-checklist">
              <span>✓ 100% Free & Open</span>
              <span>✓ Real-time Budget Gauges</span>
              <span>✓ Magazine PDF Exports</span>
              <span>✓ Offline-Ready</span>
            </div>
          </div>

          {/* Floating Interactive Live Preview Card */}
          <div className="landing-hero-preview reveal reveal-d1">
            <div className="preview-itinerary-card">
              <div className="preview-card-header">
                <div>
                  <span className="preview-badge">✨ LIVE ITINERARY DEMO</span>
                  <h3 className="preview-trip-title">Paris & Swiss Alps Odyssey</h3>
                  <p className="preview-trip-meta">5 Days · 12 Curated Stops · 2 Travelers</p>
                </div>
                <div className="preview-avatar-group">
                  <div className="preview-avatar">AK</div>
                  <div className="preview-avatar alt">GT</div>
                </div>
              </div>

              {/* Live Budget Gauge Mockup */}
              <div className="preview-budget-box">
                <div className="preview-budget-row">
                  <span>Estimated Total Budget</span>
                  <strong className="preview-budget-val">₹1,24,500 <small className="muted">/ ₹1,50,000</small></strong>
                </div>
                <div className="preview-progress-track">
                  <div className="preview-progress-fill" style={{ width: '83%' }} />
                </div>
                <div className="preview-budget-pills">
                  <span className="pill stay">🏨 Stay ₹52,000</span>
                  <span className="pill flight">✈️ Transit ₹38,000</span>
                  <span className="pill food">🍽️ Dining ₹21,500</span>
                  <span className="pill sights">🏛️ Sights ₹13,000</span>
                </div>
              </div>

              {/* Day-by-Day Progression Snippet */}
              <div className="preview-timeline-list">
                <div className="preview-timeline-item">
                  <div className="timeline-day-pill gold">DAY 1 · PARIS</div>
                  <div className="timeline-activity-row">
                    <span className="act-badge food">[FOOD & DINING]</span>
                    <span className="act-title">Breakfast at Café de Flore</span>
                    <span className="act-cost">₹2,800</span>
                  </div>
                  <div className="timeline-activity-row">
                    <span className="act-badge sights">[SIGHTSEEING]</span>
                    <span className="act-title">Louvre Museum Sunset Tour</span>
                    <span className="act-cost">₹4,200</span>
                  </div>
                </div>

                <div className="preview-timeline-item">
                  <div className="timeline-day-pill charcoal">DAY 2 · INTERLAKEN</div>
                  <div className="timeline-activity-row">
                    <span className="act-badge adventure">[ADVENTURE]</span>
                    <span className="act-title">Jungfraujoch Top of Europe Rail</span>
                    <span className="act-cost">₹14,500</span>
                  </div>
                </div>
              </div>

              <div className="preview-footer-action">
                <span className="preview-export-hint">📄 Magazine PDF Ready · 🗺️ Interactive Map Connected</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features Grid */}
      <section id="features" className="landing-features-section">
        <div className="landing-container">
          <div className="section-header-center">
            <span className="section-eyebrow">DESIGNED FOR MODERN TRAVELERS</span>
            <h2 className="section-title">Everything You Need to Plan the Perfect Trip</h2>
            <p className="section-subtitle">
              From initial brainstorm to boarding pass in hand, GlobeTrotter handles every detail seamlessly.
            </p>
          </div>

          <div className="features-bento-grid">
            {/* Feature 1 */}
            <div className="feature-bento-card">
              <div className="feature-icon-circle gold">
                <IconMap size={24} />
              </div>
              <h3>Visual Multi-City Builder</h3>
              <p>
                Add multiple cities, customize dates, and arrange activities day-by-day with flexible drag reordering and time-slot scheduling.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-bento-card">
              <div className="feature-icon-circle blue">
                <IconWallet size={24} />
              </div>
              <h3>Real-Time Budget Telemetry</h3>
              <p>
                Track expenses across stays, flights, food, and sightseeing in Indian Rupees (₹) with instant overbudget alerts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-bento-card">
              <div className="feature-icon-circle purple">
                <IconSparkles size={24} />
              </div>
              <h3>Voyage AI Concierge</h3>
              <p>
                Grounded in your trip dates and destination, Voyage AI suggests hidden local gems, generates packing lists, and answers travel queries.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-bento-card">
              <div className="feature-icon-circle green">
                <IconCompass size={24} />
              </div>
              <h3>Curated Place Discovery</h3>
              <p>
                Explore thousands of sights, cafes, and hotels worldwide powered by live OpenTripMap geocoding and rich photography.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="feature-bento-card">
              <div className="feature-icon-circle amber">
                <IconCalendar size={24} />
              </div>
              <h3>Magazine-Grade PDF Exports</h3>
              <p>
                Generate gorgeous, Swiss-inspired vertical travel brochures with dedicated cover pages and category badges for offline journeys.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="feature-bento-card">
              <div className="feature-icon-circle pink">
                <IconBookmark size={24} />
              </div>
              <h3>Community Sharing & Cloning</h3>
              <p>
                Publish read-only trip URLs for friends or clone complete itineraries to your own account with 1-click duplication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works Section */}
      <section id="how-it-works" className="landing-workflow-section">
        <div className="landing-container">
          <div className="section-header-center">
            <span className="section-eyebrow">STREAMLINED WORKFLOW</span>
            <h2 className="section-title">How GlobeTrotter Works in 3 Steps</h2>
            <p className="section-subtitle">Plan an unforgettable itinerary in minutes, not hours.</p>
          </div>

          <div className="workflow-steps-grid">
            <div className="workflow-step-card">
              <div className="step-number-badge">1</div>
              <h4>Set Destination & Dates</h4>
              <p>Choose your target cities, travel dates, and optional target budget to create your trip canvas.</p>
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">2</div>
              <h4>Add Activities & Stays</h4>
              <p>Drop in sightseeing spots, boutique hotels, food recommendations, and flights with real-time cost totals.</p>
            </div>

            <div className="workflow-step-card">
              <div className="step-number-badge">3</div>
              <h4>Export & Travel</h4>
              <p>Download your high-resolution PDF itinerary booklet, sync to your calendar, and share with fellow travelers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Popular Destinations Gallery */}
      <section id="destinations" className="landing-destinations-section">
        <div className="landing-container">
          <div className="row-between" style={{ alignItems: 'flex-end', marginBottom: 28 }}>
            <div>
              <span className="section-eyebrow">TRAVEL INSPIRATION</span>
              <h2 className="section-title">Popular Itineraries & Hotspots</h2>
            </div>
            <Link to="/discover" className="btn secondary small">
              Explore All Cities →
            </Link>
          </div>

          <div className="destinations-cards-grid">
            <div className="destination-sample-card" onClick={() => navigate(session ? '/discover?city=Paris' : '/login')}>
              <div className="dest-sample-img-wrap">
                <img
                  src="https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80"
                  alt="Paris"
                />
                <span className="dest-price-pill">Avg ₹1,45,000</span>
              </div>
              <div className="dest-sample-info">
                <h4>Paris, France</h4>
                <p>Louvre, Eiffel Tower, Le Marais & French Haute Cuisine</p>
                <div className="dest-tag-row">
                  <span className="tag">5 Days</span>
                  <span className="tag">Art & Culture</span>
                  <span className="tag">Dining</span>
                </div>
              </div>
            </div>

            <div className="destination-sample-card" onClick={() => navigate(session ? '/discover?city=Tokyo' : '/login')}>
              <div className="dest-sample-img-wrap">
                <img
                  src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80"
                  alt="Tokyo"
                />
                <span className="dest-price-pill">Avg ₹1,80,000</span>
              </div>
              <div className="dest-sample-info">
                <h4>Tokyo, Japan</h4>
                <p>Shibuya, Senso-ji, Shinkansen Rail & Tsukiji Market</p>
                <div className="dest-tag-row">
                  <span className="tag">7 Days</span>
                  <span className="tag">Tech & Heritage</span>
                  <span className="tag">Sushi</span>
                </div>
              </div>
            </div>

            <div className="destination-sample-card" onClick={() => navigate(session ? '/discover?city=Goa' : '/login')}>
              <div className="dest-sample-img-wrap">
                <img
                  src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80"
                  alt="Goa"
                />
                <span className="dest-price-pill">Avg ₹32,000</span>
              </div>
              <div className="dest-sample-info">
                <h4>Goa, India</h4>
                <p>Anjuna Beach, Old Goa Cathedrals, Fort Aguada & Seafood</p>
                <div className="dest-tag-row">
                  <span className="tag">4 Days</span>
                  <span className="tag">Beaches</span>
                  <span className="tag">Nightlife</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. AI Concierge Teaser Section */}
      <section id="voyage-ai" className="landing-ai-teaser-section">
        <div className="landing-container">
          <div className="ai-teaser-card">
            <div className="ai-teaser-text">
              <div className="hero-pill-badge" style={{ background: 'rgba(245, 180, 41, 0.2)' }}>
                <IconSparkles size={14} color="#F5B429" />
                <span>MEET VOYAGE AI</span>
              </div>
              <h2>Your Intelligent 24/7 Travel Co-Pilot</h2>
              <p>
                Ask Voyage AI to generate tailor-made day plans, find budget-friendly boutique stays, recommend dietary-friendly food spots, or craft your essential packing list.
              </p>

              <div className="ai-sample-queries">
                <div className="sample-query-bubble">
                  💬 "Plan a 3-day romantic itinerary in Rome with sunset viewpoints under ₹1,20,000."
                </div>
                <div className="sample-query-bubble">
                  💬 "What are the best vegetarian street food joints near Shibuya crossing?"
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                <Link to={session ? '/ai' : '/login'} className="btn primary-glow-btn">
                  Try Voyage AI Concierge →
                </Link>
              </div>
            </div>

            <div className="ai-teaser-mockup">
              <div className="ai-chat-preview-box">
                <div className="ai-chat-msg user">
                  <span>How should I split 6 days between Kyoto and Tokyo?</span>
                </div>
                <div className="ai-chat-msg bot">
                  <div className="bot-header">
                    <IconSparkles size={14} color="#F5B429" />
                    <strong>Voyage AI Concierge</strong>
                  </div>
                  <p>
                    I recommend <strong>4 Days in Tokyo</strong> (Shinjuku, Akihabara, Asakusa) followed by a 2-hour bullet train ride to spend <strong>2 Days in Kyoto</strong> exploring Fushimi Inari and the Arashiyama Bamboo Grove.
                  </p>
                  <div className="ai-mock-actions">
                    <span className="mock-pill">✓ Added 2 Shinkansen Tickets to Itinerary</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section className="landing-cta-section">
        <div className="landing-container">
          <div className="landing-cta-card">
            <h2>Ready to Plan Your Next Great Journey?</h2>
            <p>Built for the Odoo Hackathon to make multi-city itinerary design, budget tracking, and travel planning effortless.</p>
            <div className="cta-buttons-row">
              <Link to={session ? '/trips/new' : '/login?mode=signup'} className="btn primary-glow-btn large">
                {session ? 'Create New Trip Now →' : 'Start Planning Free →'}
              </Link>
              <Link to="/discover" className="btn secondary large">
                Explore Destinations
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Luxury Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-grid">
            <div className="footer-brand-col">
              <div className="landing-brand">
                <span className="brand-logo-icon">GT</span>
                <span className="brand-text">GlobeTrotter</span>
              </div>
              <p className="footer-tagline">
                Personalized, intelligent, and collaborative multi-city travel planning platform built for the Odoo Hackathon.
              </p>
            </div>

            <div className="footer-links-col">
              <h5>Platform</h5>
              <Link to="/trips">My Trips</Link>
              <Link to="/discover">Discover Places</Link>
              <Link to="/budget">Budget Telemetry</Link>
              <Link to="/ai">Voyage AI Concierge</Link>
            </div>

            <div className="footer-links-col">
              <h5>Resources</h5>
              <Link to="/admin">Platform Analytics</Link>
              <a href="#how-it-works">How It Works</a>
              <a href="#features">Features</a>
              <Link to="/profile">Profile & Settings</Link>
            </div>

            <div className="footer-links-col">
              <h5>Hackathon Project</h5>
              <Link to="/admin">Executive Analytics</Link>
              <Link to="/saves">Saved Collections</Link>
              <Link to="/login">Sign In / Register</Link>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p>© {new Date().getFullYear()} GlobeTrotter · Built for the Odoo Hackathon · Empowering Personalized Travel Planning.</p>
            <div className="footer-badges">
              <span style={{ color: '#F5B429', fontWeight: 700 }}>Built for Odoo Hackathon 🏆</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
