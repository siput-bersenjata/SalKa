import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import '../utils/theme.dart';

class PosScreen extends StatefulWidget {
  final ApiService apiService;
  final PrinterService printerService;

  const PosScreen({
    super.key,
    required this.apiService,
    required this.printerService,
  });

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  List<Product> _products = [];
  List<dynamic> _categories = [];
  final List<CartItem> _cart = [];

  bool _isLoading = true;
  String _selectedCategory = 'ALL';
  String _searchQuery = '';
  final _searchController = TextEditingController();

  Map<String, dynamic>? _storeProfile;
  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        widget.apiService.getProducts(),
        widget.apiService.getCategories(),
        widget.apiService.getStoreProfile(),
      ]);

      if (!mounted) return;

      final productsData = results[0] as List<dynamic>;
      final categoriesData = results[1] as List<dynamic>;
      final storeData = results[2] as Map<String, dynamic>?;

      setState(() {
        _products = productsData.map((p) => Product.fromJson(p)).toList();
        _categories = categoriesData;
        _storeProfile = storeData;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memuat data: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  List<Product> get _filteredProducts {
    return _products.where((p) {
      if (!p.isActive) return false;
      final matchCategory = _selectedCategory == 'ALL' || p.categoryId == _selectedCategory;
      final matchSearch = _searchQuery.isEmpty ||
          p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (p.barcode != null && p.barcode!.contains(_searchQuery));
      return matchCategory && matchSearch;
    }).toList();
  }

  double get _cartTotal {
    return _cart.fold(0, (sum, item) => sum + item.subtotal);
  }

  int get _cartItemCount {
    return _cart.fold(0, (sum, item) => sum + item.quantity);
  }

  void _addToCart(Product product) {
    if (product.stock <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Stok habis!'), duration: Duration(seconds: 1)),
      );
      return;
    }

    setState(() {
      final index = _cart.indexWhere((item) => item.product.id == product.id);
      if (index >= 0) {
        if (_cart[index].quantity < product.stock) {
          _cart[index].quantity++;
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Jumlah melebihi stok yang ada'), duration: Duration(seconds: 1)),
          );
        }
      } else {
        _cart.add(CartItem(product: product, quantity: 1));
      }
    });
  }

  void _updateCartQuantity(int index, int delta) {
    setState(() {
      final newQty = _cart[index].quantity + delta;
      if (newQty <= 0) {
        _cart.removeAt(index);
      } else if (newQty <= _cart[index].product.stock) {
        _cart[index].quantity = newQty;
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Jumlah melebihi stok'), duration: Duration(seconds: 1)),
        );
      }
    });
  }

  void _showCartSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setSheetState) => Container(
          height: MediaQuery.of(context).size.height * 0.75,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Sheet Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Keranjang Belanja ($_cartItemCount)',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Items List
              Expanded(
                child: _cart.isEmpty
                    ? const Center(
                        child: Text(
                          'Keranjang masih kosong',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _cart.length,
                        separatorBuilder: (_, __) => const Divider(height: 16),
                        itemBuilder: (context, index) {
                          final item = _cart[index];
                          return Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.product.name,
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _currencyFormat.format(item.product.price),
                                      style: const TextStyle(color: AppColors.primary, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                              Row(
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.remove_circle_outline, color: AppColors.error),
                                    onPressed: () {
                                      _updateCartQuantity(index, -1);
                                      setSheetState(() {});
                                      setState(() {});
                                    },
                                  ),
                                  Text(
                                    '${item.quantity}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.add_circle_outline, color: AppColors.primary),
                                    onPressed: () {
                                      _updateCartQuantity(index, 1);
                                      setSheetState(() {});
                                      setState(() {});
                                    },
                                  ),
                                ],
                              ),
                              SizedBox(
                                width: 85,
                                child: Text(
                                  _currencyFormat.format(item.subtotal),
                                  textAlign: TextAlign.right,
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
              ),

              // Bottom Checkout Panel
              if (_cart.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 10,
                        offset: const Offset(0, -3),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Pembayaran:', style: TextStyle(fontSize: 16)),
                          Text(
                            _currencyFormat.format(_cartTotal),
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _showPaymentDialog();
                        },
                        child: const Text('Lanjut ke Pembayaran', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showPaymentDialog() {
    double paidAmount = _cartTotal;
    final paidController = TextEditingController(text: paidAmount.toInt().toString());
    final customerController = TextEditingController();
    bool isProcessing = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final changeAmount = paidAmount >= _cartTotal ? paidAmount - _cartTotal : 0.0;

          return AlertDialog(
            title: const Text('Pembayaran Tunai', style: TextStyle(fontWeight: FontWeight.bold)),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      children: [
                        const Text('Total Belanja', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text(
                          _currencyFormat.format(_cartTotal),
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  TextField(
                    controller: paidController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Uang Diterima (Rp)',
                      prefixText: 'Rp ',
                    ),
                    onChanged: (val) {
                      final parsed = double.tryParse(val.replaceAll('.', '')) ?? 0.0;
                      setDialogState(() => paidAmount = parsed);
                    },
                  ),
                  const SizedBox(height: 10),

                  // Quick amount chips
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      ActionChip(
                        label: const Text('Pas'),
                        onPressed: () {
                          paidController.text = _cartTotal.toInt().toString();
                          setDialogState(() => paidAmount = _cartTotal);
                        },
                      ),
                      ...[10000, 20000, 50000, 100000].where((amount) => amount >= _cartTotal).map((amount) {
                        return ActionChip(
                          label: Text(_currencyFormat.format(amount)),
                          onPressed: () {
                            paidController.text = amount.toString();
                            setDialogState(() => paidAmount = amount.toDouble());
                          },
                        );
                      }),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Change info
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: paidAmount >= _cartTotal ? AppColors.success.withOpacity(0.1) : AppColors.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Kembalian:',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: paidAmount >= _cartTotal ? AppColors.success : AppColors.error,
                          ),
                        ),
                        Text(
                          _currencyFormat.format(changeAmount),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: paidAmount >= _cartTotal ? AppColors.success : AppColors.error,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),
                  TextField(
                    controller: customerController,
                    decoration: const InputDecoration(
                      labelText: 'Nama Pelanggan (Opsional)',
                      hintText: 'Contoh: Budi',
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isProcessing ? null : () => Navigator.pop(dialogCtx),
                child: const Text('Batal'),
              ),
              ElevatedButton(
                onPressed: (paidAmount < _cartTotal || isProcessing)
                    ? null
                    : () async {
                        setDialogState(() => isProcessing = true);
                        try {
                          final itemsPayload = _cart.map((c) => {
                            'productId': c.product.id,
                            'productName': c.product.name,
                            'quantity': c.quantity,
                            'price': c.product.price,
                            'subtotal': c.subtotal,
                          }).toList();

                          final res = await widget.apiService.createTransaction(
                            items: itemsPayload,
                            paidAmount: paidAmount,
                            customerName: customerController.text.trim().isNotEmpty
                                ? customerController.text.trim()
                                : null,
                          );

                          if (!mounted) return;
                          Navigator.pop(dialogCtx);

                          if (res['statusCode'] == 201 || res['statusCode'] == 200) {
                            final tx = res['transaction'];
                            _showSuccessDialog(
                              invoiceNumber: tx != null ? tx['invoiceNumber'] : 'INV-${DateTime.now().millisecondsSinceEpoch}',
                              total: _cartTotal,
                              paid: paidAmount,
                              change: changeAmount,
                              items: itemsPayload,
                            );

                            // Refresh products stock & clear cart
                            _loadData();
                            setState(() => _cart.clear());
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(res['error'] ?? 'Gagal memproses transaksi'), backgroundColor: AppColors.error),
                            );
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Terjadi kesalahan: $e'), backgroundColor: AppColors.error),
                            );
                          }
                        }
                      },
                child: isProcessing
                    ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Bayar & Selesai'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showSuccessDialog({
    required String invoiceNumber,
    required double total,
    required double paid,
    required double change,
    required List<Map<String, dynamic>> items,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.success.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, color: AppColors.success, size: 54),
            ),
            const SizedBox(height: 16),
            const Text('Transaksi Berhasil!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(invoiceNumber, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 12),
            Text(
              'Kembalian: ${_currencyFormat.format(change)}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.success),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              icon: const Icon(Icons.print_rounded),
              label: const Text('Cetak Struk Thermal'),
              onPressed: () async {
                final storeName = _storeProfile?['name'] ?? 'KasirKu Store';
                final storeAddress = _storeProfile?['address'];
                final storePhone = _storeProfile?['phone'];
                final paperSize = _storeProfile?['receiptPaperSize'] ?? '58mm';
                final header = _storeProfile?['receiptHeader'];
                final footer = _storeProfile?['receiptFooter'];

                final ok = await widget.printerService.printReceipt(
                  storeName: storeName,
                  storeAddress: storeAddress,
                  storePhone: storePhone,
                  invoiceNumber: invoiceNumber,
                  dateTime: DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now()),
                  cashierName: 'Kasir',
                  items: items,
                  totalAmount: total,
                  paidAmount: paid,
                  changeAmount: change,
                  paymentMethod: 'TUNAI',
                  receiptHeader: header,
                  receiptFooter: footer,
                  paperSize: paperSize,
                );

                if (!ctx.mounted) return;
                if (!ok) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Printer belum terhubung! Silakan ke menu Pengaturan Printer.'),
                      backgroundColor: AppColors.warning,
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Struk berhasil dicetak!'), backgroundColor: AppColors.success),
                  );
                }
              },
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Transaksi Baru'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(_storeProfile?['name'] ?? 'KasirKu POS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Search & Filter Bar
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Column(
                    children: [
                      TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'Cari menu atau scan barcode...',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 18),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _searchQuery = '');
                                  },
                                )
                              : null,
                          contentPadding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        onChanged: (val) => setState(() => _searchQuery = val),
                      ),
                      const SizedBox(height: 8),

                      // Category Pills
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: FilterChip(
                                label: const Text('Semua'),
                                selected: _selectedCategory == 'ALL',
                                onSelected: (_) => setState(() => _selectedCategory = 'ALL'),
                              ),
                            ),
                            ..._categories.map((cat) {
                              final isSelected = _selectedCategory == cat['id'];
                              return Padding(
                                padding: const EdgeInsets.only(right: 6),
                                child: FilterChip(
                                  label: Text(cat['name']),
                                  selected: isSelected,
                                  onSelected: (_) => setState(() => _selectedCategory = cat['id']),
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Product Grid
                Expanded(
                  child: _filteredProducts.isEmpty
                      ? const Center(
                          child: Text(
                            'Tidak ada produk ditemukan',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.all(12),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.85,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                          itemCount: _filteredProducts.length,
                          itemBuilder: (context, index) {
                            final product = _filteredProducts[index];
                            final inCart = _cart.firstWhere(
                              (c) => c.product.id == product.id,
                              orElse: () => CartItem(product: product, quantity: 0),
                            );

                            return InkWell(
                              onTap: () => _addToCart(product),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: inCart.quantity > 0 ? AppColors.primary : AppColors.border,
                                    width: inCart.quantity > 0 ? 1.5 : 1,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.03),
                                      blurRadius: 6,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                padding: const EdgeInsets.all(10),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Stock badge & cart count badge
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: product.stock <= 0
                                                ? AppColors.error.withOpacity(0.1)
                                                : (product.isLowStock ? AppColors.warning.withOpacity(0.1) : Colors.grey.shade100),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            product.stock <= 0
                                                ? 'Habis'
                                                : (product.isLowStock ? 'Sisa ${product.stock}' : 'Stok: ${product.stock}'),
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: product.stock <= 0
                                                  ? AppColors.error
                                                  : (product.isLowStock ? AppColors.warning : AppColors.textSecondary),
                                            ),
                                          ),
                                        ),
                                        if (inCart.quantity > 0)
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppColors.primary,
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Text(
                                              '${inCart.quantity}',
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                    const Spacer(),

                                    // Product Name
                                    Text(
                                      product.name,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 4),

                                    // Price
                                    Text(
                                      _currencyFormat.format(product.price),
                                      style: const TextStyle(
                                        color: AppColors.primary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),

                // Floating Cart Bar
                if (_cart.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: const Border(top: BorderSide(color: AppColors.border)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 10,
                          offset: const Offset(0, -3),
                        ),
                      ],
                    ),
                    child: SafeArea(
                      top: false,
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  '$_cartItemCount Item Terpilih',
                                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                ),
                                Text(
                                  _currencyFormat.format(_cartTotal),
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            ),
                            icon: const Icon(Icons.shopping_cart_checkout),
                            label: const Text('Bayar'),
                            onPressed: _showCartSheet,
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}
