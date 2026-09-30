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
    return Product(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      price: (json['price'] is num) ? (json['price'] as num).toDouble() : 0.0,
      costPrice: (json['costPrice'] is num) ? (json['costPrice'] as num).toDouble() : 0.0,
      stock: json['stock'] is int ? json['stock'] : (json['stock'] != null ? int.tryParse(json['stock'].toString()) ?? 0 : 0),
      minStock: json['minStock'] is int ? json['minStock'] : (json['minStock'] != null ? int.tryParse(json['minStock'].toString()) ?? 5 : 5),
      barcode: json['barcode'],
      imageUrl: json['imageUrl'],
      categoryId: json['categoryId'],
      categoryName: json['category'] != null ? json['category']['name'] : null,
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
