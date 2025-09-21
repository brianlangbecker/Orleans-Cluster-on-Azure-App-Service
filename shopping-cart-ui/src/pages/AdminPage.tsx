import React from 'react';

const AdminPage: React.FC = () => {
  return (
    <div className="container" style={{ padding: '4rem 0', color: 'white', textAlign: 'center' }}>
      <h1>Admin Portal</h1>
      <p>Admin page coming soon...</p>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        padding: '2rem', 
        borderRadius: '20px', 
        margin: '2rem auto',
        maxWidth: '600px'
      }}>
        <p>This page will provide product management and system monitoring capabilities.</p>
        <br />
        <a href="/api/shop/products" style={{ color: '#ff6b6b' }}>Manage Products API</a>
      </div>
    </div>
  );
};

export default AdminPage;