import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../theme/HomePage.css';

interface Stats {
  productCount: number;
  cartCount: number;
}

const HomePage: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ productCount: 0, cartCount: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    // Load stats from Orleans API
    Promise.all([
      fetch('/api/shop/products').then(r => r.json()),
      fetch('/api/shop/cart').then(r => r.json())
    ]).then(([products, cart]) => {
      setStats({
        productCount: products.success ? products.count : 0,
        cartCount: cart.success ? cart.count : 0
      });
    }).catch(console.error);
  }, []);

  return (
    <main>
      <section className="hero fade-in">
        <div className="container">
          <h1>Welcome to Orleans Shopping</h1>
          <p className="hero-subtitle">Experience Next-Generation E-Commerce</p>
          <p className="hero-description">
            Powered by Microsoft Orleans and enhanced with comprehensive OpenTelemetry distributed tracing. 
            Shop with confidence knowing every interaction is monitored and optimized for the best experience.
          </p>
          <div className="actions">
            <Link to="/shop" className="btn btn-primary">Start Shopping</Link>
            <Link to="/cart" className="btn btn-secondary">View Cart</Link>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="features fade-in">
          <div className="feature-card" onClick={() => navigate('/shop')}>
            <span className="feature-icon">🛍️</span>
            <h3>Smart Shopping</h3>
            <p>Browse our curated collection with intelligent quantity selection and real-time inventory updates.</p>
          </div>
          
          <div className="feature-card" onClick={() => navigate('/cart')}>
            <span className="feature-icon">🛒</span>
            <h3>Dynamic Cart</h3>
            <p>Seamlessly manage your cart with live quantity adjustments and instant total calculations.</p>
          </div>
          
          <div className="feature-card" onClick={() => navigate('/admin')}>
            <span className="feature-icon">⚙️</span>
            <h3>Admin Portal</h3>
            <p>Comprehensive product management with real-time analytics and distributed system monitoring.</p>
          </div>
        </div>

        <div className="stats fade-in">
          <div className="stat-item">
            <h4>{stats.productCount}+</h4>
            <p>Products Available</p>
          </div>
          <div className="stat-item">
            <h4>100%</h4>
            <p>Distributed Tracing</p>
          </div>
          <div className="stat-item">
            <h4>⚡</h4>
            <p>Real-time Updates</p>
          </div>
          <div className="stat-item">
            <h4>🔒</h4>
            <p>Secure & Reliable</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;