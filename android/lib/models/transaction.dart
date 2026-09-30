class TransactionModel {
  final String id;
  final String invoiceNumber;
  final double totalAmount;
  final double paidAmount;
  final double changeAmount;
  final String paymentMethod;
  final String status;
  final String? customerName;
  final String? notes;
  final DateTime createdAt;
  final List<TransactionItemModel> items;

  TransactionModel({
    required this.id,
    required this.invoiceNumber,
    required this.totalAmount,
    required this.paidAmount,
    required this.changeAmount,
    required this.paymentMethod,
    required this.status,
    this.customerName,
    this.notes,
    required this.createdAt,
    this.items = const [],
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    List<TransactionItemModel> parsedItems = [];
    if (json['items'] != null && json['items'] is List) {
      parsedItems = (json['items'] as List)
          .map((item) => TransactionItemModel.fromJson(item))
          .toList();
    }

    return TransactionModel(
      id: json['id'] ?? '',
      invoiceNumber: json['invoiceNumber'] ?? '',
      totalAmount: (json['totalAmount'] is num) ? (json['totalAmount'] as num).toDouble() : 0.0,
      paidAmount: (json['paidAmount'] is num) ? (json['paidAmount'] as num).toDouble() : 0.0,
      changeAmount: (json['changeAmount'] is num) ? (json['changeAmount'] as num).toDouble() : 0.0,
      paymentMethod: json['paymentMethod'] ?? 'CASH',
      status: json['status'] ?? 'COMPLETED',
      customerName: json['customerName'],
      notes: json['notes'],
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt']) ?? DateTime.now()
          : DateTime.now(),
      items: parsedItems,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'invoiceNumber': invoiceNumber,
      'totalAmount': totalAmount,
      'paidAmount': paidAmount,
      'changeAmount': changeAmount,
      'paymentMethod': paymentMethod,
      'status': status,
      'customerName': customerName,
      'notes': notes,
      'createdAt': createdAt.toIso8601String(),
      'items': items.map((i) => i.toJson()).toList(),
    };
  }
}

class TransactionItemModel {
  final String id;
  final String? productId;
  final String productName;
  final int quantity;
  final double price;
  final double subtotal;

  TransactionItemModel({
    required this.id,
    this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.subtotal,
  });

  factory TransactionItemModel.fromJson(Map<String, dynamic> json) {
    return TransactionItemModel(
      id: json['id'] ?? '',
      productId: json['productId'],
      productName: json['productName'] ?? '',
      quantity: json['quantity'] is int ? json['quantity'] : (json['quantity'] != null ? int.tryParse(json['quantity'].toString()) ?? 1 : 1),
      price: (json['price'] is num) ? (json['price'] as num).toDouble() : 0.0,
      subtotal: (json['subtotal'] is num) ? (json['subtotal'] as num).toDouble() : 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'price': price,
      'subtotal': subtotal,
    };
  }
}
