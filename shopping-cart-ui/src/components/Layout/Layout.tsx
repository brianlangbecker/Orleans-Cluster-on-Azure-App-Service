import React from 'react';
import { Link } from 'react-router-dom';
import './Layout.css';
import { useCart } from '../../context/CartContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { cartCount } = useCart();

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <nav className="nav">
            <Link to="/" className="logo">🛒 Orleans Cart</Link>
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/shop">Shop</Link></li>
              <li><Link to="/cart">Cart <span className="cart-badge">{cartCount}</span></Link></li>
              <li><Link to="/products">Products</Link></li>
              <li><Link to="/admin">Admin</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      {children}

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Quick Links</h4>
              <Link to="/shop">Shop Products</Link>
              <Link to="/cart">Shopping Cart</Link>
              <Link to="/admin">Product Management</Link>
            </div>
            <div className="footer-section">
              <h4>Technology</h4>
              <a href="https://docs.microsoft.com/en-us/dotnet/orleans/" target="_blank" rel="noopener noreferrer">Microsoft Orleans</a>
              <a href="https://opentelemetry.io/" target="_blank" rel="noopener noreferrer">OpenTelemetry</a>
              <a href="https://www.honeycomb.io/" target="_blank" rel="noopener noreferrer">Honeycomb</a>
            </div>
            <div className="footer-section">
              <h4>APIs</h4>
              <a href="/api/shop/products">Products API</a>
              <a href="/api/shop/cart">Cart API</a>
              <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer">Python API Docs</a>
            </div>
          </div>
          <div className="copyright">
            <p>&copy; 2024 Orleans Shopping Cart Demo. Built with Orleans, React & OpenTelemetry.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;