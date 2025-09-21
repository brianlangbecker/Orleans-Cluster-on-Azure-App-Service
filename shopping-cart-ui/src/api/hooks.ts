import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { Product, CartItem } from './types';

// Product hooks
export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => api.products.getAll(),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => api.products.getById(id),
  });
}

export function useProductsByCategory(category: string) {
  return useQuery({
    queryKey: ['products', 'category', category],
    queryFn: () => api.products.getByCategory(category),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (product: Omit<Product, 'id'>) => api.products.create(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, product }: { id: string; product: Product }) =>
      api.products.update(id, product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Cart hooks
export function useCart() {
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => api.cart.getItems(),
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      api.cart.addItem(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => api.cart.removeItem(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.cart.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// Inventory hooks
export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.inventory.getAll(),
  });
}

export function useInventoryByCategory(category: string) {
  return useQuery({
    queryKey: ['inventory', 'category', category],
    queryFn: () => api.inventory.getByCategory(category),
  });
}

export function useInventoryHealth() {
  return useQuery({
    queryKey: ['inventory', 'health'],
    queryFn: () => api.inventory.isHealthy(),
    refetchInterval: 30000, // Check health every 30 seconds
  });
}
