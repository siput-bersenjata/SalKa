import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/product.dart';
import '../services/api_service.dart';
import '../utils/theme.dart';

class ProductsScreen extends StatefulWidget {
  final ApiService apiService;
  const ProductsScreen({super.key, required this.apiService});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  List<Product> _products = [];
  List<dynamic> _categories = [];
  bool _isLoading = true;
  String _searchQuery = '';
  bool _filterLowStockOnly = false;
  final _searchController = TextEditingController();

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
      ]);

      if (!mounted) return;

      final productsData = results[0] as List<dynamic>;
      final categoriesData = results[1] as List<dynamic>;

      setState(() {
        _products = productsData.map((p) => Product.fromJson(p)).toList();
        _categories = categoriesData;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memuat produk: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  List<Product> get _filteredProducts {
    return _products.where((p) {
      if (_filterLowStockOnly && !p.isLowStock) return false;
      if (_searchQuery.isEmpty) return true;
      return p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (p.barcode != null && p.barcode!.contains(_searchQuery));
    }).toList();
  }

  void _showAddEditProductDialog([Product? existingProduct]) {
    final isEdit = existingProduct != null;
    final nameController = TextEditingController(text: existingProduct?.name ?? '');
    final priceController = TextEditingController(text: existingProduct != null ? existingProduct.price.toInt().toString() : '');
    final costPriceController = TextEditingController(text: existingProduct != null ? existingProduct.costPrice.toInt().toString() : '');
    final stockController = TextEditingController(text: existingProduct != null ? existingProduct.stock.toString() : '10');
    final minStockController = TextEditingController(text: existingProduct != null ? existingProduct.minStock.toString() : '5');
    final barcodeController = TextEditingController(text: existingProduct?.barcode ?? '');
    String? selectedCategory = existingProduct?.categoryId ?? (_categories.isNotEmpty ? _categories.first['id'] : null);

    bool isSubmitting = false;

    showDialog(
      context: context,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(isEdit ? 'Edit Menu & Stok' : 'Tambah Menu Baru', style: const TextStyle(fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Nama Menu / Produk *',
                    hintText: 'Contoh: Es Teh Manis',
                  ),
                ),
                const SizedBox(height: 12),
                if (_categories.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    value: selectedCategory,
                    decoration: const InputDecoration(labelText: 'Kategori'),
                    items: _categories.map<DropdownMenuItem<String>>((c) {
                      return DropdownMenuItem<String>(
                        value: c['id'],
                        child: Text(c['name']),
                      );
                    }).toList(),
                    onChanged: (val) => setDialogState(() => selectedCategory = val),
                  ),
                  const SizedBox(height: 12),
                ],
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: priceController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Harga Jual *',
                          prefixText: 'Rp ',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: costPriceController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Harga Modal',
                          prefixText: 'Rp ',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: stockController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Stok Saat Ini *',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: minStockController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Batas Min. Stok',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: barcodeController,
                  decoration: const InputDecoration(
                    labelText: 'Barcode / Kode SKU (Opsional)',
                    hintText: 'Contoh: 89912345678',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: isSubmitting ? null : () => Navigator.pop(dialogCtx),
              child: const Text('Batal'),
            ),
            ElevatedButton(
              onPressed: isSubmitting
                  ? null
                  : () async {
                      final name = nameController.text.trim();
                      final price = double.tryParse(priceController.text) ?? 0.0;
                      final costPrice = double.tryParse(costPriceController.text) ?? 0.0;
                      final stock = int.tryParse(stockController.text) ?? 0;
                      final minStock = int.tryParse(minStockController.text) ?? 5;
                      final barcode = barcodeController.text.trim().isNotEmpty ? barcodeController.text.trim() : null;

                      if (name.isEmpty || price <= 0) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Nama dan harga jual wajib diisi!')),
                        );
                        return;
                      }

                      setDialogState(() => isSubmitting = true);

                      try {
                        final payload = {
                          'name': name,
                          'price': price,
                          'costPrice': costPrice,
                          'stock': stock,
                          'minStock': minStock,
                          'barcode': barcode,
                          'categoryId': selectedCategory,
                        };

                        if (isEdit) {
                          await widget.apiService.updateProduct(existingProduct.id, payload);
                        } else {
                          await widget.apiService.addProduct(payload);
                        }

                        if (!mounted) return;
                        Navigator.pop(dialogCtx);
                        _loadData();
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(isEdit ? 'Menu berhasil diperbarui' : 'Menu berhasil ditambahkan'),
                            backgroundColor: AppColors.success,
                          ),
                        );
                      } catch (e) {
                        if (mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Gagal menyimpan: $e'), backgroundColor: AppColors.error),
                          );
                        }
                      }
                    },
              child: isSubmitting
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(isEdit ? 'Simpan Perubahan' : 'Tambah Menu'),
            ),
          ],
        ),
      ),
    );
  }

  void _quickStockAdjust(Product product, int delta) async {
    final newStock = product.stock + delta;
    if (newStock < 0) return;

    try {
      await widget.apiService.updateProduct(product.id, {'stock': newStock});
      setState(() {
        final idx = _products.indexWhere((p) => p.id == product.id);
        if (idx >= 0) {
          _products[idx] = Product(
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            costPrice: product.costPrice,
            stock: newStock,
            minStock: product.minStock,
            barcode: product.barcode,
            imageUrl: product.imageUrl,
            categoryId: product.categoryId,
            categoryName: product.categoryName,
            isActive: product.isActive,
          );
        }
      });
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Menu & Pengaturan Stok'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.add),
        label: const Text('Tambah Menu'),
        onPressed: () => _showAddEditProductDialog(),
      ),
      body: Column(
        children: [
          // Search & Filter
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Cari nama produk atau SKU...',
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
                Row(
                  children: [
                    FilterChip(
                      label: const Text('Semua'),
                      selected: !_filterLowStockOnly,
                      onSelected: (_) => setState(() => _filterLowStockOnly = false),
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: const Text('⚠️ Stok Menipis'),
                      selected: _filterLowStockOnly,
                      selectedColor: AppColors.warning.withOpacity(0.2),
                      onSelected: (_) => setState(() => _filterLowStockOnly = true),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Product List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredProducts.isEmpty
                    ? const Center(
                        child: Text(
                          'Tidak ada produk',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: ListView.separated(
                          padding: const EdgeInsets.only(left: 12, right: 12, top: 12, bottom: 80),
                          itemCount: _filteredProducts.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final product = _filteredProducts[index];
                            return Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: product.stock <= 0
                                      ? AppColors.error
                                      : (product.isLowStock ? AppColors.warning : AppColors.border),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          product.name,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _currencyFormat.format(product.price),
                                          style: const TextStyle(
                                            color: AppColors.primary,
                                            fontWeight: FontWeight.w600,
                                            fontSize: 14,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Text(
                                              'Min: ${product.minStock}',
                                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                            ),
                                            if (product.barcode != null) ...[
                                              const SizedBox(width: 10),
                                              Text(
                                                'SKU: ${product.barcode}',
                                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Quick stock adjuster
                                  Column(
                                    children: [
                                      Row(
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.remove_circle_outline, size: 22, color: AppColors.textSecondary),
                                            onPressed: () => _quickStockAdjust(product, -1),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: product.stock <= 0
                                                  ? AppColors.error.withOpacity(0.15)
                                                  : (product.isLowStock ? AppColors.warning.withOpacity(0.15) : AppColors.surface),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              '${product.stock}',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 15,
                                                color: product.stock <= 0
                                                    ? AppColors.error
                                                    : (product.isLowStock ? AppColors.warning : AppColors.textPrimary),
                                              ),
                                            ),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.add_circle_outline, size: 22, color: AppColors.primary),
                                            onPressed: () => _quickStockAdjust(product, 1),
                                          ),
                                        ],
                                      ),
                                      InkWell(
                                        onTap: () => _showAddEditProductDialog(product),
                                        child: const Padding(
                                          padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          child: Text(
                                            'Edit Detail',
                                            style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
