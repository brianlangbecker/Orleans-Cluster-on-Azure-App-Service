import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import { Add, Edit, Delete, Casino } from '@mui/icons-material';

interface Product {
  id: string;
  name: string;
  description: string;
  category: number;
  quantity: number;
  unitPrice: number;
  detailsUrl: string;
  imageUrl: string;
}

// ProductCategory enum mapping (matches C# enum)
enum ProductCategory {
  Accessories = 0,
  Hardware = 1,
  Software = 2,
  Books = 3,
  Movies = 4,
  Music = 5,
  Games = 6,
  Other = 7
}

const categories = [
  'Accessories',
  'Hardware', 
  'Software',
  'Books',
  'Movies',
  'Music',
  'Games',
  'Other'
];

// Random data for generating bogus products
const adjectives = [
  'Amazing', 'Awesome', 'Brilliant', 'Fantastic', 'Incredible', 'Magnificent', 'Outstanding', 'Spectacular',
  'Sleek', 'Modern', 'Vintage', 'Classic', 'Premium', 'Deluxe', 'Professional', 'Ultimate',
  'Smart', 'Advanced', 'Innovative', 'Revolutionary', 'Cutting-edge', 'State-of-the-art', 'High-tech',
  'Ergonomic', 'Compact', 'Portable', 'Wireless', 'Digital', 'Electronic', 'Mechanical', 'Automatic',
  'Handcrafted', 'Artisan', 'Designer', 'Limited', 'Exclusive', 'Rare', 'Collectible', 'Signature'
];

const materials = [
  'Steel', 'Aluminum', 'Carbon', 'Titanium', 'Plastic', 'Wood', 'Glass', 'Ceramic', 'Leather',
  'Fabric', 'Rubber', 'Silicon', 'Metal', 'Composite', 'Bamboo', 'Stone', 'Crystal', 'Diamond'
];

const productTypes = [
  'Widget', 'Gadget', 'Device', 'Tool', 'Accessory', 'Component', 'Module', 'System', 'Kit',
  'Set', 'Collection', 'Bundle', 'Package', 'Solution', 'Platform', 'Framework', 'Interface',
  'Controller', 'Monitor', 'Display', 'Keyboard', 'Mouse', 'Speaker', 'Headphone', 'Camera',
  'Sensor', 'Adapter', 'Cable', 'Charger', 'Battery', 'Case', 'Cover', 'Stand', 'Mount',
  'Book', 'Guide', 'Manual', 'Tutorial', 'Course', 'Software', 'App', 'Game', 'Movie', 'Album'
];

const companies = [
  'TechCorp', 'InnovateCo', 'FutureTech', 'SmartSystems', 'ProGear', 'EliteDevices', 'NextGen',
  'QuantumTech', 'CyberSolutions', 'DigitalWorks', 'MegaTech', 'UltraDevices', 'PowerSystems',
  'FlexiTech', 'RapidSolutions', 'PrecisionCorp', 'DynamicSystems', 'OptimalTech', 'MaxiDevices'
];

const descriptions = [
  'Perfect for everyday use and professional applications',
  'Designed with cutting-edge technology and premium materials',
  'Combines functionality with sleek, modern design',
  'Built to last with superior craftsmanship and attention to detail',
  'Features advanced capabilities in a compact, portable form',
  'Engineered for maximum performance and reliability',
  'Offers exceptional value with innovative features',
  'Crafted with precision and tested for durability',
  'Delivers outstanding results with user-friendly operation',
  'Represents the latest in technological advancement'
];

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    description: '',
    category: ProductCategory.Other,
    quantity: 0,
    unitPrice: 0,
    detailsUrl: '',
    imageUrl: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('Loading products...');
      const response = await fetch('/api/shop/products');
      console.log('Load products response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Load products data:', data);
      
      if (data.success) {
        setProducts(data.products);
        console.log('Products loaded successfully:', data.products.length);
      } else {
        showSnackbar('Failed to load products', 'error');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      showSnackbar('Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const getRandomElement = (array: string[]) => {
    return array[Math.floor(Math.random() * array.length)];
  };

  const generateRandomProduct = () => {
    const adjective = getRandomElement(adjectives);
    const material = getRandomElement(materials);
    const productType = getRandomElement(productTypes);
    const company = getRandomElement(companies);
    const categoryName = getRandomElement(categories);
    const description = getRandomElement(descriptions);
    
    // Generate random price between $5 and $500
    const price = Math.round((Math.random() * 495 + 5) * 100) / 100;
    
    // Generate random quantity between 1 and 1000
    const quantity = Math.floor(Math.random() * 1000) + 1;
    
    // Generate random product ID
    const productId = Math.random().toString(36).substr(2, 9);
    
    // Get the enum value for the category
    const categoryEnum = ProductCategory[categoryName as keyof typeof ProductCategory];
    
    return {
      id: productId,
      name: `${adjective} ${material} ${productType}`,
      description: `${description}. Made by ${company} with premium ${material.toLowerCase()} construction.`,
      category: categoryEnum,
      quantity: quantity,
      unitPrice: price,
      detailsUrl: `https://example.com/products/${productId}`,
      imageUrl: `https://picsum.photos/400/300?random=${productId}`
    };
  };

  const handleCreateRandomProduct = async () => {
    try {
      const randomProduct = generateRandomProduct();
      
      const response = await fetch('/api/shop/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(randomProduct)
      });

      const data = await response.json();
      
      if (data.success) {
        showSnackbar(`Random product "${randomProduct.name}" created successfully!`, 'success');
        loadProducts();
      } else {
        showSnackbar(data.error || 'Failed to create random product', 'error');
      }
    } catch (error) {
      console.error('Error creating random product:', error);
      showSnackbar('Error creating random product', 'error');
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      id: '',
      name: '',
      description: '',
      category: ProductCategory.Other,
      quantity: 0,
      unitPrice: 0,
      detailsUrl: '',
      imageUrl: ''
    });
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
  };

  const handleInputChange = (field: keyof Product) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = field === 'quantity' || field === 'unitPrice' 
      ? parseFloat(event.target.value) || 0 
      : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCategoryChange = (event: any) => {
    const categoryName = event.target.value;
    const categoryEnum = ProductCategory[categoryName as keyof typeof ProductCategory];
    setFormData(prev => ({
      ...prev,
      category: categoryEnum
    }));
  };

  const handleSaveProduct = async () => {
    try {
      const url = editingProduct 
        ? `/api/shop/products/${editingProduct.id}`
        : '/api/shop/products';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        showSnackbar(
          editingProduct ? 'Product updated successfully' : 'Product created successfully',
          'success'
        );
        handleCloseDialog();
        loadProducts();
      } else {
        showSnackbar(data.error || 'Failed to save product', 'error');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showSnackbar('Error saving product', 'error');
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    console.log('Delete button clicked for product:', product);
    
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      console.log('Delete cancelled by user');
      return;
    }

    console.log('Proceeding with delete for product ID:', product.id);

    try {
      const url = `/api/shop/products/${product.id}`;
      console.log('DELETE request URL:', url);
      
      const response = await fetch(url, {
        method: 'DELETE'
      });

      console.log('Delete response status:', response.status);
      const data = await response.json();
      console.log('Delete response data:', data);
      
      if (data.success) {
        showSnackbar('Product deleted successfully', 'success');
        loadProducts();
      } else {
        showSnackbar(data.error || 'Failed to delete product', 'error');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showSnackbar('Error deleting product', 'error');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Products
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Casino />}
            onClick={handleCreateRandomProduct}
            color="secondary"
          >
            Generate Random Product
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreateDialog}
          >
            Create Product
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>{product.name}</TableCell>
                <TableCell>{categories[product.category] || 'Other'}</TableCell>
                <TableCell>${product.unitPrice.toFixed(2)}</TableCell>
                <TableCell>{product.quantity}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={() => openEditDialog(product)}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => handleDeleteProduct(product)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingProduct ? 'Edit Product' : 'Create Product'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={formData.name}
              onChange={handleInputChange('name')}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={handleInputChange('description')}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={categories[formData.category] || 'Other'}
                onChange={handleCategoryChange}
                label="Category"
              >
                {categories.map((category) => (
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
              onChange={handleInputChange('quantity')}
              fullWidth
            />
            <TextField
              label="Unit Price"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={handleInputChange('unitPrice')}
              fullWidth
            />
            <TextField
              label="Details URL"
              value={formData.detailsUrl}
              onChange={handleInputChange('detailsUrl')}
              fullWidth
            />
            <TextField
              label="Image URL"
              value={formData.imageUrl}
              onChange={handleInputChange('imageUrl')}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveProduct} variant="contained">
            {editingProduct ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductsPage;
