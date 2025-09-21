import React, { useState, useEffect } from 'react';
import '../theme/ShopPage.css';
import { useCart } from '../context/CartContext';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  detailsUrl: string;
  imageUrl: string;
}

interface ApiResponse {
  success: boolean;
  count: number;
  products: Product[];
}

const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { cartCount, updateCartCount } = useCart();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/shop/products');
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setProducts(data.products);
      } else {
        setError('Failed to load products');
      }
    } catch (err) {
      setError('Error loading products: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };


  const addToCart = async (productId: string, quantity: number = 1) => {
    setAddingToCart(productId);
    try {
      const response = await fetch(`/api/shop/cart/add/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });

      const data = await response.json();
      
      if (data.success) {
        await updateCartCount(); // Update the global cart count
        setMessage(data.message);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to add to cart');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      setError('Error adding to cart: ' + (err as Error).message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <div className="shop-container">
        <div className="loading">
          <h2>Loading products...</h2>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shop-container">
        <div className="error">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={loadProducts} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-container">
      <div className="shop-header">
        <h1>🛍️ Product Catalog</h1>
        <p>Discover amazing products powered by Orleans & distributed tracing</p>
        <div className="cart-info">
          Cart: <span className="cart-count">{cartCount}</span> items
        </div>
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

      {products.length === 0 ? (
        <div className="no-products">
          <h3>No products available</h3>
          <p>Check back later for new arrivals!</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img 
                  src={product.imageUrl || '/placeholder-product.png'} 
                  alt={product.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMThweCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiM5OTkiPlByb2R1Y3Q8L3RleHQ+PC9zdmc+';
                  }}
                />
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-meta">
                  <span className="product-category">{product.category}</span>
                  <span className="product-stock">Stock: {product.quantity}</span>
                </div>
                <div className="product-price">${product.unitPrice.toFixed(2)}</div>
                <div className="product-actions">
                  <div className="quantity-controls">
                    <button 
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                        if (input && parseInt(input.value) > 1) {
                          input.value = (parseInt(input.value) - 1).toString();
                        }
                      }}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      min="1" 
                      max={product.quantity}
                      defaultValue="1"
                      className="quantity-input"
                    />
                    <button 
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                        if (input && parseInt(input.value) < product.quantity) {
                          input.value = (parseInt(input.value) + 1).toString();
                        }
                      }}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).parentElement?.querySelector('.quantity-input') as HTMLInputElement;
                      const quantity = input ? parseInt(input.value) : 1;
                      addToCart(product.id, quantity);
                    }}
                    disabled={addingToCart === product.id || product.quantity === 0}
                    className={`btn btn-primary add-to-cart ${addingToCart === product.id ? 'loading' : ''}`}
                  >
                    {addingToCart === product.id ? (
                      <>
                        <span className="spinner-small"></span>
                        Adding...
                      </>
                    ) : product.quantity === 0 ? (
                      'Out of Stock'
                    ) : (
                      'Add to Cart'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShopPage;