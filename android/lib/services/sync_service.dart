import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../models/transaction.dart';
import 'api_service.dart';

class SyncService extends ChangeNotifier {
  final ApiService apiService;
  Timer? _autoSyncTimer;

  static const _keyProducts = 'salka_local_products';
  static const _keyCategories = 'salka_local_categories';
  static const _keyTransactions = 'salka_local_transactions';
  static const _keyProfile = 'salka_local_profile';
  static const _keyQueue = 'salka_sync_queue';
  static const _keyIdMap = 'salka_id_mapping';
  static const _keyLastSync = 'salka_last_sync_timestamp';

  List<Product> _products = [];
  List<dynamic> _categories = [];
  List<TransactionModel> _transactions = [];
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _queue = [];
  Map<String, String> _idMap = {};

  bool _isInitialized = false;
  bool _isSyncing = false;
  String? _lastSyncError;
  DateTime? _lastSyncTime;

  SyncService({required this.apiService});

  bool get isInitialized => _isInitialized;
  bool get isSyncing => _isSyncing;
  bool get isSynced => _queue.isEmpty && _lastSyncError == null;
  int get pendingCount => _queue.length;
  String? get lastSyncError => _lastSyncError;
  DateTime? get lastSyncTime => _lastSyncTime;

  List<Product> get products => List.unmodifiable(_products);
  List<dynamic> get categories => List.unmodifiable(_categories);
  List<TransactionModel> get transactions => List.unmodifiable(_transactions);
  Map<String, dynamic>? get profile => _profile;

  Future<void> init() async {
    if (_isInitialized) return;
    await _loadFromLocal();
    _isInitialized = true;
    notifyListeners();

    // Start auto sync every 25 seconds
    _autoSyncTimer?.cancel();
    _autoSyncTimer = Timer.periodic(const Duration(seconds: 25), (_) {
      syncInBackground();
    });

    // Initial background sync
    syncInBackground();
  }

  @override
  void dispose() {
    _autoSyncTimer?.cancel();
    super.dispose();
  }

  // ================= LOCAL PERSISTENCE =================

  Future<void> _loadFromLocal() async {
    final prefs = await SharedPreferences.getInstance();

    // Products
    final rawProds = prefs.getString(_keyProducts);
    if (rawProds != null && rawProds.isNotEmpty) {
      try {
        final List<dynamic> decoded = jsonDecode(rawProds);
        _products = decoded.map((p) => Product.fromJson(p)).toList();
      } catch (_) {}
    }

    // Categories
    final rawCats = prefs.getString(_keyCategories);
    if (rawCats != null && rawCats.isNotEmpty) {
      try {
        _categories = jsonDecode(rawCats);
      } catch (_) {}
    }

    // Transactions
    final rawTxs = prefs.getString(_keyTransactions);
    if (rawTxs != null && rawTxs.isNotEmpty) {
      try {
        final List<dynamic> decoded = jsonDecode(rawTxs);
        _transactions = decoded.map((t) => TransactionModel.fromJson(t)).toList();
      } catch (_) {}
    }

    // Profile
    final rawProf = prefs.getString(_keyProfile);
    if (rawProf != null && rawProf.isNotEmpty) {
      try {
        _profile = jsonDecode(rawProf);
      } catch (_) {}
    }

    // Queue
    final rawQ = prefs.getString(_keyQueue);
    if (rawQ != null && rawQ.isNotEmpty) {
      try {
        _queue = List<Map<String, dynamic>>.from(jsonDecode(rawQ));
      } catch (_) {}
    }

    // ID Map
    final rawIdMap = prefs.getString(_keyIdMap);
    if (rawIdMap != null && rawIdMap.isNotEmpty) {
      try {
        _idMap = Map<String, String>.from(jsonDecode(rawIdMap));
      } catch (_) {}
    }

    // Last Sync Time
    final rawTime = prefs.getString(_keyLastSync);
    if (rawTime != null) {
      _lastSyncTime = DateTime.tryParse(rawTime);
    }
  }

  Future<void> _saveProducts() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyProducts, jsonEncode(_products.map((p) => p.toJson()).toList()));
  }

  Future<void> _saveTransactions() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyTransactions, jsonEncode(_transactions.map((t) => t.toJson()).toList()));
  }

  Future<void> _saveQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyQueue, jsonEncode(_queue));
    await prefs.setString(_keyIdMap, jsonEncode(_idMap));
  }

  Future<void> _saveProfile() async {
    if (_profile == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyProfile, jsonEncode(_profile));
  }

  // ================= LOCAL CRUD (INSTANT) =================

  /// Transaksi Baru (Kasir Checkout)
  /// Menyimpan transaksi lokal, memotong stok produk lokal seketika,
  /// dan mendaftarkan antrean sinkronisasi ke cloud.
  Future<TransactionModel> createTransactionLocal({
    required List<CartItem> cartItems,
    required double totalAmount,
    required double paidAmount,
    required double changeAmount,
    required String paymentMethod,
    String? customerName,
    String? notes,
  }) async {
    final now = DateTime.now();
    final dateStr = DateFormat('yyMMdd-HHmmss').format(now);
    final randomSuffix = Random().nextInt(900) + 100;
    final invoiceNumber = 'INV-$dateStr-$randomSuffix';
    final localTxId = 'local_tx_${now.millisecondsSinceEpoch}_$randomSuffix';

    // 1. Buat Model Transaksi Lokal
    final itemsList = cartItems.map((cart) {
      return TransactionItemModel(
        id: 'local_item_${Random().nextInt(999999)}',
        productId: cart.product.id,
        productName: cart.product.name,
        quantity: cart.quantity,
        price: cart.product.price,
        subtotal: cart.subtotal,
      );
    }).toList();

    final tx = TransactionModel(
      id: localTxId,
      invoiceNumber: invoiceNumber,
      totalAmount: totalAmount,
      paidAmount: paidAmount,
      changeAmount: changeAmount,
      paymentMethod: paymentMethod,
      status: 'COMPLETED',
      customerName: customerName,
      notes: notes,
      createdAt: now,
      items: itemsList,
    );

    // 2. Potong stok produk lokal seketika
    for (final cart in cartItems) {
      final index = _products.indexWhere((p) => p.id == cart.product.id);
      if (index != -1) {
        final current = _products[index];
        final newStock = max(0, current.stock - cart.quantity);
        _products[index] = Product(
          id: current.id,
          name: current.name,
          description: current.description,
          price: current.price,
          costPrice: current.costPrice,
          stock: newStock,
          minStock: current.minStock,
          barcode: current.barcode,
          imageUrl: current.imageUrl,
          categoryId: current.categoryId,
          categoryName: current.categoryName,
          isActive: current.isActive,
        );
      }
    }

    // 3. Simpan Transaksi ke Local Storage
    _transactions.insert(0, tx);
    await _saveTransactions();
    await _saveProducts();

    // 4. Masukkan ke Antrean Sinkronisasi Cloud
    final apiPayload = {
      'items': cartItems.map((c) => {
        'productId': c.product.id,
        'quantity': c.quantity,
      }).toList(),
      'paymentMethod': paymentMethod,
      'paidAmount': paidAmount,
      'customerName': customerName,
      'notes': notes,
    };

    _queue.add({
      'queueId': 'queue_${now.millisecondsSinceEpoch}_$randomSuffix',
      'action': 'CREATE_TRANSACTION',
      'localTxId': localTxId,
      'data': apiPayload,
      'createdAt': now.toIso8601String(),
    });

    await _saveQueue();
    notifyListeners();

    // 5. Jalankan sinkronisasi background (non-blocking)
    syncInBackground();

    return tx;
  }

  /// Tambah Menu/Produk Baru
  /// Disimpan ke lokal langsung dengan ID sementara dan diantrekan ke cloud.
  Future<Product> addProductLocal(Map<String, dynamic> data) async {
    final now = DateTime.now();
    final localId = 'local_prod_${now.millisecondsSinceEpoch}_${Random().nextInt(999)}';

    String? categoryName;
    if (data['categoryId'] != null) {
      final cat = _categories.firstWhere((c) => c['id'] == data['categoryId'], orElse: () => null);
      if (cat != null) categoryName = cat['name'];
    }

    final newProduct = Product(
      id: localId,
      name: data['name'] ?? '',
      price: (data['price'] as num?)?.toDouble() ?? 0.0,
      costPrice: (data['costPrice'] as num?)?.toDouble() ?? 0.0,
      stock: (data['stock'] as num?)?.toInt() ?? 0,
      minStock: (data['minStock'] as num?)?.toInt() ?? 5,
      barcode: data['barcode'],
      categoryId: data['categoryId'],
      categoryName: categoryName,
      isActive: true,
    );

    _products.insert(0, newProduct);
    await _saveProducts();

    _queue.add({
      'queueId': 'queue_${now.millisecondsSinceEpoch}',
      'action': 'CREATE_PRODUCT',
      'localId': localId,
      'data': data,
      'createdAt': now.toIso8601String(),
    });

    await _saveQueue();
    notifyListeners();

    syncInBackground();
    return newProduct;
  }

  /// Update Produk Lokal
  Future<void> updateProductLocal(String id, Map<String, dynamic> data) async {
    final index = _products.indexWhere((p) => p.id == id);
    if (index != -1) {
      final old = _products[index];
      String? categoryName = old.categoryName;
      if (data['categoryId'] != null) {
        final cat = _categories.firstWhere((c) => c['id'] == data['categoryId'], orElse: () => null);
        if (cat != null) categoryName = cat['name'];
      }

      _products[index] = Product(
        id: old.id,
        name: data['name'] ?? old.name,
        price: data['price'] != null ? (data['price'] as num).toDouble() : old.price,
        costPrice: data['costPrice'] != null ? (data['costPrice'] as num).toDouble() : old.costPrice,
        stock: data['stock'] != null ? (data['stock'] as num).toInt() : old.stock,
        minStock: data['minStock'] != null ? (data['minStock'] as num).toInt() : old.minStock,
        barcode: data['barcode'] ?? old.barcode,
        categoryId: data['categoryId'] ?? old.categoryId,
        categoryName: categoryName,
        isActive: old.isActive,
      );
      await _saveProducts();
    }

    _queue.add({
      'queueId': 'queue_${DateTime.now().millisecondsSinceEpoch}',
      'action': 'UPDATE_PRODUCT',
      'targetId': id,
      'data': data,
      'createdAt': DateTime.now().toIso8601String(),
    });

    await _saveQueue();
    notifyListeners();

    syncInBackground();
  }

  /// Penyesuaian Cepat Stok (+/- 1)
  Future<void> adjustStockLocal(String productId, int delta) async {
    final index = _products.indexWhere((p) => p.id == productId);
    if (index == -1) return;

    final current = _products[index];
    final newStock = max(0, current.stock + delta);

    _products[index] = Product(
      id: current.id,
      name: current.name,
      description: current.description,
      price: current.price,
      costPrice: current.costPrice,
      stock: newStock,
      minStock: current.minStock,
      barcode: current.barcode,
      imageUrl: current.imageUrl,
      categoryId: current.categoryId,
      categoryName: current.categoryName,
      isActive: current.isActive,
    );
    await _saveProducts();

    _queue.add({
      'queueId': 'queue_${DateTime.now().millisecondsSinceEpoch}',
      'action': 'UPDATE_PRODUCT',
      'targetId': productId,
      'data': {'stock': newStock},
      'createdAt': DateTime.now().toIso8601String(),
    });

    await _saveQueue();
    notifyListeners();

    syncInBackground();
  }

  /// Hapus Produk Lokal
  Future<void> deleteProductLocal(String id) async {
    _products.removeWhere((p) => p.id == id);
    await _saveProducts();

    _queue.add({
      'queueId': 'queue_${DateTime.now().millisecondsSinceEpoch}',
      'action': 'DELETE_PRODUCT',
      'targetId': id,
      'createdAt': DateTime.now().toIso8601String(),
    });

    await _saveQueue();
    notifyListeners();

    syncInBackground();
  }

  /// Update Profil Toko Lokal
  Future<void> updateStoreProfileLocal(Map<String, dynamic> data) async {
    _profile = {...?_profile, ...data};
    await _saveProfile();

    _queue.add({
      'queueId': 'queue_${DateTime.now().millisecondsSinceEpoch}',
      'action': 'UPDATE_STORE_PROFILE',
      'data': data,
      'createdAt': DateTime.now().toIso8601String(),
    });

    await _saveQueue();
    notifyListeners();

    syncInBackground();
  }

  // ================= BACKGROUND SYNC ENGINE =================

  /// Menjalankan proses sinkronisasi antrean ke cloud database
  Future<void> syncInBackground() async {
    if (_isSyncing || !apiService.isLoggedIn) return;

    _isSyncing = true;
    notifyListeners();

    try {
      final List<Map<String, dynamic>> remainingQueue = [];

      for (final item in _queue) {
        final action = item['action'];
        final data = Map<String, dynamic>.from(item['data'] ?? {});

        try {
          if (action == 'CREATE_PRODUCT') {
            final localId = item['localId'];
            final res = await apiService.addProduct(data);
            if (res['statusCode'] == 200 || res['statusCode'] == 201) {
              final serverProduct = res['product'];
              if (serverProduct != null && serverProduct['id'] != null) {
                final realId = serverProduct['id'].toString();
                _idMap[localId] = realId;

                // Ganti ID lokal di daftar produk dengan ID resmi dari server
                final pIdx = _products.indexWhere((p) => p.id == localId);
                if (pIdx != -1) {
                  final p = _products[pIdx];
                  _products[pIdx] = Product(
                    id: realId,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    costPrice: p.costPrice,
                    stock: p.stock,
                    minStock: p.minStock,
                    barcode: p.barcode,
                    imageUrl: p.imageUrl,
                    categoryId: p.categoryId,
                    categoryName: p.categoryName,
                    isActive: p.isActive,
                  );
                  await _saveProducts();
                }
              }
            } else {
              remainingQueue.add(item);
            }
          } else if (action == 'UPDATE_PRODUCT') {
            String targetId = item['targetId'];
            if (_idMap.containsKey(targetId)) {
              targetId = _idMap[targetId]!;
            }
            final res = await apiService.updateProduct(targetId, data);
            if (res['statusCode'] != 200 && res['statusCode'] != 201) {
              remainingQueue.add(item);
            }
          } else if (action == 'DELETE_PRODUCT') {
            String targetId = item['targetId'];
            if (_idMap.containsKey(targetId)) {
              targetId = _idMap[targetId]!;
            }
            // Jika ID masih local dan belum pernah masuk server, abaikan
            if (!targetId.startsWith('local_')) {
              final ok = await apiService.deleteProduct(targetId);
              if (!ok) remainingQueue.add(item);
            }
          } else if (action == 'CREATE_TRANSACTION') {
            // Remap product IDs jika ada yang dibuat saat offline
            if (data['items'] != null && data['items'] is List) {
              for (final itm in data['items']) {
                final pId = itm['productId'];
                if (_idMap.containsKey(pId)) {
                  itm['productId'] = _idMap[pId];
                }
              }
            }

            final itemsList = (data['items'] as List)
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
            final paidAmount = (data['paidAmount'] as num).toDouble();
            final paymentMethod = data['paymentMethod']?.toString() ?? 'CASH';
            final customerName = data['customerName']?.toString();
            final notes = data['notes']?.toString();

            final res = await apiService.createTransaction(
              items: itemsList,
              paidAmount: paidAmount,
              paymentMethod: paymentMethod,
              customerName: customerName,
              notes: notes,
            );
            if (res['statusCode'] == 200 || res['statusCode'] == 201) {
              // Sukses sinkron transaksi
              final serverTx = res['transaction'];
              if (serverTx != null && item['localTxId'] != null) {
                final txIdx = _transactions.indexWhere((t) => t.id == item['localTxId']);
                if (txIdx != -1) {
                  final t = _transactions[txIdx];
                  _transactions[txIdx] = TransactionModel(
                    id: serverTx['id'] ?? t.id,
                    invoiceNumber: serverTx['invoiceNumber'] ?? t.invoiceNumber,
                    totalAmount: t.totalAmount,
                    paidAmount: t.paidAmount,
                    changeAmount: t.changeAmount,
                    paymentMethod: t.paymentMethod,
                    status: 'COMPLETED',
                    customerName: t.customerName,
                    notes: t.notes,
                    createdAt: t.createdAt,
                    items: t.items,
                  );
                  await _saveTransactions();
                }
              }
            } else {
              remainingQueue.add(item);
            }
          } else if (action == 'UPDATE_STORE_PROFILE') {
            final res = await apiService.updateStoreProfile(data);
            if (res['statusCode'] != 200 && res['statusCode'] != 201) {
              remainingQueue.add(item);
            }
          }
        } catch (_) {
          // Kesalahan koneksi per-item
          remainingQueue.add(item);
        }
      }

      _queue = remainingQueue;
      await _saveQueue();

      // Jika seluruh antrean selesai, ambil data terbaru dari cloud untuk memastikan konsistensi
      if (_queue.isEmpty) {
        await _pullFreshCloudData();
        _lastSyncError = null;
        _lastSyncTime = DateTime.now();
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_keyLastSync, _lastSyncTime!.toIso8601String());
      }
    } catch (e) {
      _lastSyncError = e.toString();
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  /// Mengambil data terbaru dari Cloud saat koneksi tersedia
  Future<void> _pullFreshCloudData() async {
    try {
      final results = await Future.wait([
        apiService.getProducts(),
        apiService.getCategories(),
        apiService.getTransactions(limit: 50),
        apiService.getStoreProfile(),
      ]);

      final cloudProds = results[0] as List<dynamic>;
      final cloudCats = results[1] as List<dynamic>;
      final cloudTxs = results[2] as List<dynamic>;
      final cloudProf = results[3] as Map<String, dynamic>?;

      if (cloudProds.isNotEmpty) {
        _products = cloudProds.map((p) => Product.fromJson(p)).toList();
        await _saveProducts();
      }

      if (cloudCats.isNotEmpty) {
        _categories = cloudCats;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_keyCategories, jsonEncode(_categories));
      }

      if (cloudTxs.isNotEmpty) {
        _transactions = cloudTxs.map((t) => TransactionModel.fromJson(t)).toList();
        await _saveTransactions();
      }

      if (cloudProf != null) {
        _profile = cloudProf;
        await _saveProfile();
      }
    } catch (_) {}
  }

  /// Sinkronisasi manual paksa (misal saat klik ikon cloud atau refresh)
  Future<void> forceSync() async {
    _lastSyncError = null;
    notifyListeners();
    await syncInBackground();
  }
}
