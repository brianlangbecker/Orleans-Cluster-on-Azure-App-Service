"""
Data models for the Python Inventory Service
"""
from enum import Enum
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from decimal import Decimal
import json


class ProductCategory(Enum):
    """Product categories matching the C# enum"""
    ACCESSORIES = "Accessories"
    HARDWARE = "Hardware"
    SOFTWARE = "Software"
    BOOKS = "Books"
    MOVIES = "Movies"
    MUSIC = "Music"
    GAMES = "Games"
    OTHER = "Other"


@dataclass
class ProductDetails:
    """Product details matching the C# record class"""
    id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    category: ProductCategory = ProductCategory.OTHER
    quantity: int = 0
    unit_price: Decimal = Decimal('0.00')
    details_url: Optional[str] = None
    image_url: Optional[str] = None

    @property
    def total_price(self) -> Decimal:
        """Calculate total price (quantity * unit_price)"""
        return round(self.quantity * self.unit_price, 2)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        result = asdict(self)
        result['category'] = self.category.value
        result['unit_price'] = float(self.unit_price)
        result['total_price'] = float(self.total_price)
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProductDetails':
        """Create ProductDetails from dictionary"""
        if 'category' in data:
            # Handle both string and enum values
            category_value = data['category']
            if isinstance(category_value, str):
                data['category'] = ProductCategory(category_value)
        
        if 'unit_price' in data:
            data['unit_price'] = Decimal(str(data['unit_price']))
            
        return cls(**data)

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict())

    @classmethod
    def from_json(cls, json_str: str) -> 'ProductDetails':
        """Create ProductDetails from JSON string"""
        return cls.from_dict(json.loads(json_str))