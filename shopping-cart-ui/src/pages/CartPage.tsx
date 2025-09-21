import React, { useState, useEffect } from 'react';
import '../theme/CartPage.css';
import { useCart } from '../context/CartContext';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string;
}

interface CartResponse {
  success: boolean;
  count: number;
  totalPrice: number;
  items: CartItem[];
}

const CartPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showCheckoutPopup, setShowCheckoutPopup] = useState(false);
  const { updateCartCount } = useCart();

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      const response = await fetch('/api/shop/cart');
      const data: CartResponse = await response.json();
      
      if (data.success) {
        setCartItems(data.items);
        setTotalPrice(data.totalPrice);
      } else {
        setError('Failed to load cart');
      }
    } catch (err) {
      setError('Error loading cart: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdating(productId);
    try {
      const response = await fetch(`/api/shop/cart/update/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      const data = await response.json();
      
      if (data.success) {
        await loadCart(); // Reload to get updated totals
        await updateCartCount(); // Update global cart count
        setMessage(data.message);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to update quantity');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError('Error updating quantity: ' + (err as Error).message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (productId: string) => {
    console.log('Remove item clicked for product:', productId);
    setUpdating(productId);
    try {
      const response = await fetch(`/api/shop/cart/remove/${productId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      console.log('Remove item response:', data);
      
      if (data.success) {
        console.log('Item removed successfully, reloading cart...');
        await loadCart(); // Reload to get updated cart
        await updateCartCount(); // Update global cart count
        setMessage(data.message);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to remove item');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Error removing item: ' + (err as Error).message);
      setTimeout(() => setError(null), 3000);
    } finally {
      console.log('Setting updating to null for product:', productId);
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    setUpdating('clear');
    try {
      const response = await fetch('/api/shop/cart/clear', {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setCartItems([]);
        setTotalPrice(0);
        await updateCartCount(); // Update global cart count
        setMessage(data.message);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to clear cart');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError('Error clearing cart: ' + (err as Error).message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = () => {
    setShowCheckoutPopup(true);
  };

  const closeCheckoutPopup = () => {
    setShowCheckoutPopup(false);
  };

  if (loading) {
    return (
      <div className="cart-container">
        <div className="loading">
          <h2>Loading cart...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>🛒 Shopping Cart</h1>
        <p>Review your items and proceed to checkout</p>
      </div>

      {message && (
        <div className="message success">
          {message}
        </div>
      )}

      {error && (
        <div className="message error">
          {error}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some amazing products to get started!</p>
          <a href="/shop" className="btn btn-primary">
            Start Shopping
          </a>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.productId} className="cart-item">
                <div className="item-image">
                  <img 
                    src={item.imageUrl || '/placeholder-product.png'} 
                    alt={item.productName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTJweCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTkiPkl0ZW08L3RleHQ+PC9zdmc+';
                    }}
                  />
                </div>
                <div className="item-details">
                  <h3 className="item-name">{item.productName}</h3>
                  <div className="item-price">${item.unitPrice.toFixed(2)} each</div>
                </div>
                <div className="item-controls">
                  <div className="quantity-controls">
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      disabled={updating === item.productId || item.quantity <= 1}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity-display">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={updating === item.productId}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <div className="item-total">${item.totalPrice.toFixed(2)}</div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    disabled={updating === item.productId}
                    className="btn btn-danger"
                  >
                    {updating === item.productId ? (
                      <>
                        <span className="spinner-small"></span>
                        Removing...
                      </>
                    ) : (
                      '🗑️ Remove'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-content">
              <div className="summary-row">
                <span>Items ({cartItems.length}):</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping:</span>
                <span>FREE</span>
              </div>
              <div className="summary-row total">
                <span>Total:</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className="cart-actions">
                <button
                  onClick={clearCart}
                  disabled={updating === 'clear'}
                  className="btn btn-secondary"
                >
                  {updating === 'clear' ? (
                    <>
                      <span className="spinner-small"></span>
                      Clearing...
                    </>
                  ) : (
                    'Clear Cart'
                  )}
                </button>
                <button 
                  onClick={handleCheckout}
                  className="btn btn-primary checkout-btn"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Checkout Popup */}
      {showCheckoutPopup && (
        <div className="popup-overlay" onClick={closeCheckoutPopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>🚧 Feature Under Development</h3>
              <button className="popup-close" onClick={closeCheckoutPopup}>×</button>
            </div>
            <div className="popup-body">
              <p>
                <strong>Checkout functionality is currently being worked on!</strong>
              </p>
              <p>
                Our development team is actively building the checkout process. 
                This feature will include:
              </p>
              <ul>
                <li>✅ Payment processing</li>
                <li>✅ Order confirmation</li>
                <li>✅ Shipping options</li>
                <li>✅ Email notifications</li>
              </ul>
              <p>
                <em>Expected completion: Coming soon!</em>
              </p>
            </div>
            <div className="popup-footer">
              <button className="btn btn-primary" onClick={closeCheckoutPopup}>
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;