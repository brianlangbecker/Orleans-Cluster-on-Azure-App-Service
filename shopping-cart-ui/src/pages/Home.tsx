import { Box, List, ListItem, Typography } from '@mui/material';

export function Home() {
  return (
    <Box maxWidth="md" mx="auto" mt={4}>
      <Typography variant="h4" gutterBottom>
        Welcome to the Shopping Cart
      </Typography>
      <List>
        <ListItem>
          Use the <strong>Products</strong> link to manage products.
        </ListItem>
        <ListItem>
          Use the <strong>Cart</strong> link to view your shopping cart.
        </ListItem>
      </List>
    </Box>
  );
}
