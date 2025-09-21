import {
  Box,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { CartItem as CartItemType } from '../../api/types';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartItem({ item, onQuantityChange, onRemove }: CartItemProps) {
  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = parseInt(event.target.value, 10);
    if (!isNaN(quantity) && quantity >= 1) {
      onQuantityChange(item.productId, quantity);
    }
  };

  return (
    <TableRow>
      <TableCell>
        <Stack direction="row" spacing={2} alignItems="center">
          {item.imageUrl && (
            <Box
              component="img"
              src={item.imageUrl}
              alt={item.name}
              sx={{
                width: 50,
                height: 50,
                objectFit: 'cover',
                borderRadius: 1,
              }}
            />
          )}
          <Typography>{item.name}</Typography>
        </Stack>
      </TableCell>
      <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
      <TableCell>
        <TextField
          type="number"
          value={item.quantity}
          onChange={handleQuantityChange}
          inputProps={{ min: 1, max: 100 }}
          size="small"
          sx={{ width: 80 }}
        />
      </TableCell>
      <TableCell>${item.total.toFixed(2)}</TableCell>
      <TableCell>
        <IconButton
          color="error"
          onClick={() => onRemove(item.productId)}
        >
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
