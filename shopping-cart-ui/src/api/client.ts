import axios from 'axios';
import { Product, CartItem } from './types';

const orléansApi = axios.create({
  baseURL: 'http://localhost:5001/api',
});

const pythonApi = axios.create({
  baseURL: 'http://localhost:8000',
});

export const api = {
  // Product endpoints
  products: {
    getAll: async () => {
      const response = await orléansApi.get<Product[]>('/products');
      return response.data;
    },
    getById: async (id: string) => {
      const response = await orléansApi.get<Product>(`/products/${id}`);
      return response.data;
    },
    getByCategory: async (category: string) => {
      const response = await orléansApi.get<Product[]>(`/products/category/${category}`);
      return response.data;
    },
    create: async (product: Omit<Product, 'id'>) => {
      const response = await orléansApi.post<Product>('/products', product);
      return response.data;
    },
    update: async (id: string, product: Product) => {
      const response = await orléansApi.put<Product>(`/products/${id}`, product);
      return response.data;
    },
    delete: async (id: string) => {
      await orléansApi.delete(`/products/${id}`);
    },
  },

  // Cart endpoints
  cart: {
    getItems: async () => {
      const response = await orléansApi.get<CartItem[]>('/cart');
      return response.data;
    },
    addItem: async (productId: string, quantity: number) => {
      const response = await orléansApi.post<CartItem>(`/cart/${productId}`, quantity);
      return response.data;
    },
    removeItem: async (productId: string) => {
      await orléansApi.delete(`/cart/${productId}`);
    },
    clear: async () => {
      await orléansApi.delete('/cart');
    },
  },

  // Python Inventory Service endpoints
  inventory: {
    getAll: async () => {
      const response = await pythonApi.get<Product[]>('/products');
      return response.data;
    },
    getByCategory: async (category: string) => {
      const response = await pythonApi.get<Product[]>(`/products/${category}`);
      return response.data;
    },
    isHealthy: async () => {
      const response = await pythonApi.get<{ status: string }>('/health');
      return response.data.status === 'ok';
    },
  },
};
