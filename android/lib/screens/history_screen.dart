import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/transaction.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import '../services/sync_service.dart';
import '../utils/theme.dart';

class HistoryScreen extends StatefulWidget {
  final ApiService apiService;
  final PrinterService printerService;
  final SyncService syncService;

  const HistoryScreen({
    super.key,
    required this.apiService,
    required this.printerService,
    required this.syncService,
  });

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  bool _isLoading = false;
  String _searchQuery = '';
  final _searchController = TextEditingController();

  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  List<TransactionModel> get _transactions => widget.syncService.transactions;
  Map<String, dynamic>? get _storeProfile => widget.syncService.profile;

  @override
  void initState() {
    super.initState();
    widget.syncService.addListener(_onSyncUpdate);
  }

  void _onSyncUpdate() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    widget.syncService.removeListener(_onSyncUpdate);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      await widget.syncService.forceSync();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  List<TransactionModel> get _filteredTransactions {
    if (_searchQuery.isEmpty) return _transactions;
    return _transactions.where((t) {
      return t.invoiceNumber.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (t.customerName != null && t.customerName!.toLowerCase().contains(_searchQuery.toLowerCase()));
    }).toList();
  }

  void _showDetailDialog(TransactionModel tx) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tx.invoiceNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            Text(
              DateFormat('dd/MM/yyyy HH:mm').format(tx.createdAt),
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (tx.customerName != null) ...[
                Text('Pelanggan: ${tx.customerName}', style: const TextStyle(fontSize: 13)),
                const SizedBox(height: 8),
              ],
              const Divider(),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 200),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: tx.items.length,
                  itemBuilder: (context, i) {
                    final item = tx.items[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${item.productName} (x${item.quantity})',
                              style: const TextStyle(fontSize: 13),
                            ),
                          ),
                          Text(
                            _currencyFormat.format(item.subtotal),
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total:', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(
                    _currencyFormat.format(tx.totalAmount),
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 15),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Bayar (${tx.paymentMethod}):', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                  Text(_currencyFormat.format(tx.paidAmount), style: const TextStyle(fontSize: 12)),
                ],
              ),
              if (tx.changeAmount > 0) ...[
                const SizedBox(height: 2),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Kembalian:', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                    Text(_currencyFormat.format(tx.changeAmount), style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Tutup'),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.print_rounded, size: 18),
            label: const Text('Cetak Struk'),
            onPressed: () async {
              final storeName = _storeProfile?['name'] ?? 'KasirKu Store';
              final storeAddress = _storeProfile?['address'];
              final storePhone = _storeProfile?['phone'];
              final paperSize = _storeProfile?['receiptPaperSize'] ?? '58mm';
              final header = _storeProfile?['receiptHeader'];
              final footer = _storeProfile?['receiptFooter'];
              final hideInvoice = _storeProfile?['hideInvoiceOnReceipt'] == true;

              final itemsPayload = tx.items.map((it) => {
                'productName': it.productName,
                'quantity': it.quantity,
                'price': it.price,
                'subtotal': it.subtotal,
              }).toList();

              final ok = await widget.printerService.printReceipt(
                storeName: storeName,
                storeAddress: storeAddress,
                storePhone: storePhone,
                invoiceNumber: hideInvoice ? '' : tx.invoiceNumber,
                dateTime: DateFormat('dd/MM/yyyy HH:mm').format(tx.createdAt),
                cashierName: 'Kasir',
                items: itemsPayload,
                totalAmount: tx.totalAmount,
                paidAmount: tx.paidAmount,
                changeAmount: tx.changeAmount,
                paymentMethod: tx.paymentMethod,
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
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Riwayat Transaksi'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Cari nomor nota atau nama pelanggan...',
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
          ),

          // Transaction List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredTransactions.isEmpty
                    ? const Center(
                        child: Text(
                          'Belum ada transaksi',
                          style: TextStyle(color: AppColors.textSecondary),
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadData,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: _filteredTransactions.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, index) {
                            final tx = _filteredTransactions[index];
                            return InkWell(
                              onTap: () => _showDetailDialog(tx),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: AppColors.border),
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Icon(
                                        Icons.receipt_long_rounded,
                                        color: AppColors.primary,
                                        size: 24,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            tx.invoiceNumber,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            DateFormat('dd MMM yyyy, HH:mm').format(tx.createdAt),
                                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                          ),
                                          if (tx.customerName != null) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              'Pelanggan: ${tx.customerName}',
                                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 11),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          _currencyFormat.format(tx.totalAmount),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.success.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            tx.paymentMethod,
                                            style: const TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.success,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
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
