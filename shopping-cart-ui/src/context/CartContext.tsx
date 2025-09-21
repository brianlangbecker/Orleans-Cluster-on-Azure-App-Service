import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartContextType {
  cartCount: number;
  updateCartCount: () => Promise<void>;
  incrementCartCount: (amount?: number) => void;
  decrementCartCount: (amount?: number) => void;
  setCartCount: (count: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);

  const updateCartCount = async () => {
    try {
      const response = await fetch('/api/shop/cart');
      const data = await response.json();
      if (data.success) {
        setCartCount(data.count);
      }
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  };

  const incrementCartCount = (amount: number = 1) => {
    setCartCount(prev => prev + amount);
  };

  const decrementCartCount = (amount: number = 1) => {
    setCartCount(prev => Math.max(0, prev - amount));
  };

  // Load initial cart count
  useEffect(() => {
    updateCartCount();
  }, []);

  const value: CartContextType = {
    cartCount,
    updateCartCount,
    incrementCartCount,
    decrementCartCount,
    setCartCount,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
