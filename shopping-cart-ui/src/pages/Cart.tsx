import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { CartItem } from '../components/Cart/CartItem';
import {
  useCart,
  useAddToCart,
  useRemoveFromCart,
  useClearCart,
} from '../api/hooks';

export function Cart() {
  const { data: cartItems, isLoading } = useCart();
  const addToCart = useAddToCart();
  const removeFromCart = useRemoveFromCart();
  const clearCart = useClearCart();

  const handleQuantityChange = async (productId: string, quantity: number) => {
    await addToCart.mutateAsync({ productId, quantity });
  };

  const handleRemoveItem = async (productId: string) => {
    await removeFromCart.mutateAsync(productId);
  };

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      await clearCart.mutateAsync();
    }
  };

  const total = cartItems?.reduce((sum, item) => sum + item.total, 0) ?? 0;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!cartItems?.length) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Shopping Cart
        </Typography>
        <Alert severity="info">Your cart is empty.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Shopping Cart
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {cartItems.map((item) => (
              <CartItem
                key={item.productId}
                item={item}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveItem}
              />
            ))}
            <TableRow>
              <TableCell colSpan={3}>
                <strong>Total</strong>
              </TableCell>
              <TableCell>
                <strong>${total.toFixed(2)}</strong>
              </TableCell>
              <TableCell>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleClearCart}
                >
                  Clear Cart
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
