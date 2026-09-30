class Product {
  final String id;
  final String name;
  final String? description;
  final double price;
  final double costPrice;
  final int stock;
  final int minStock;
  final String? barcode;
  final String? imageUrl;
  final String? categoryId;
  final String? categoryName;
  final bool isActive;

  Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.costPrice = 0.0,
    required this.stock,
    this.minStock = 5,
    this.barcode,
    this.imageUrl,
    this.categoryId,
    this.categoryName,
    this.isActive = true,
  });

  bool get isLowStock => stock <= minStock;

  factory Product.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }

    int parseInt(dynamic val, int fallback) {
      if (val == null) return fallback;
      if (val is int) return val;
      if (val is num) return val.toInt();
      return int.tryParse(val.toString()) ?? fallback;
    }

    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString(),
      price: parseDouble(json['price']),
      costPrice: parseDouble(json['costPrice']),
      stock: parseInt(json['stock'], 0),
      minStock: parseInt(json['minStock'], 5),
      barcode: json['barcode']?.toString(),
      imageUrl: json['imageUrl']?.toString(),
      categoryId: json['categoryId']?.toString(),
      categoryName: json['category'] != null ? json['category']['name']?.toString() : null,
      isActive: json['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'price': price,
      'costPrice': costPrice,
      'stock': stock,
      'minStock': minStock,
      'barcode': barcode,
      'categoryId': categoryId,
      'isActive': isActive,
    };
  }
}

class CartItem {
  final Product product;
  int quantity;

  CartItem({required this.product, this.quantity = 1});

  double get subtotal => product.price * quantity;
}
