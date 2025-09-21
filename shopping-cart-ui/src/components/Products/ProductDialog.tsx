import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
} from '@mui/material';
import { Product, ProductCategory } from '../../api/types';

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id'>) => void;
  product?: Product;
  title: string;
}

export function ProductDialog({
  open,
  onClose,
  onSave,
  product,
  title,
}: ProductDialogProps) {
  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? ProductCategory.Other,
    quantity: product?.quantity ?? 0,
    unitPrice: product?.unitPrice ?? 0,
    detailsUrl: product?.detailsUrl ?? '',
    imageUrl: product?.imageUrl ?? '',
  });

  const handleChange = (field: keyof Omit<Product, 'id'>) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.value;
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'quantity' || field === 'unitPrice' ? Number(value) : value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={handleChange('name')}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={handleChange('description')}
              multiline
              rows={3}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={handleChange('category')}
                label="Category"
              >
                {Object.values(ProductCategory).map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Quantity"
              type="number"
              value={formData.quantity}
              onChange={handleChange('quantity')}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              label="Price"
              type="number"
              value={formData.unitPrice}
              onChange={handleChange('unitPrice')}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
            />
            <TextField
              label="Image URL"
              value={formData.imageUrl}
              onChange={handleChange('imageUrl')}
              fullWidth
            />
            <TextField
              label="Details URL"
              value={formData.detailsUrl}
              onChange={handleChange('detailsUrl')}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
