import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:intl/intl.dart';
import '../services/printer_service.dart';
import '../services/api_service.dart';
import '../utils/theme.dart';

class PrinterSettingsScreen extends StatefulWidget {
  final PrinterService printerService;
  final ApiService apiService;

  const PrinterSettingsScreen({
    super.key,
    required this.printerService,
    required this.apiService,
  });

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  List<ScanResult> _scanResults = [];
  bool _isScanning = false;
  bool _isConnecting = false;
  Map<String, dynamic>? _storeProfile;

  @override
  void initState() {
    super.initState();
    _loadStoreProfile();
  }

  Future<void> _loadStoreProfile() async {
    final profile = await widget.apiService.getStoreProfile();
    if (mounted) setState(() => _storeProfile = profile);
  }

  Future<void> _requestPermissionsAndScan() async {
    // Request Bluetooth permissions
    await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ].request();

    setState(() {
      _isScanning = true;
      _scanResults = [];
    });

    try {
      final results = await widget.printerService.scanDevices(timeout: const Duration(seconds: 4));
      if (mounted) {
        setState(() {
          _scanResults = results;
          _isScanning = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isScanning = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal memindai bluetooth: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _connectToDevice(BluetoothDevice device) async {
    setState(() => _isConnecting = true);
    try {
      final success = await widget.printerService.connect(device);
      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Terhubung ke ${device.platformName.isNotEmpty ? device.platformName : "Printer"}!'),
            backgroundColor: AppColors.success,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gagal menghubungkan ke printer. Pastikan printer dalam keadaan menyala.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isConnecting = false);
    }
  }

  Future<void> _testPrint() async {
    final storeName = _storeProfile?['name'] ?? 'KasirKu Test';
    final paperSize = _storeProfile?['receiptPaperSize'] ?? '58mm';

    final ok = await widget.printerService.printReceipt(
      storeName: storeName,
      storeAddress: _storeProfile?['address'] ?? 'Alamat Toko',
      storePhone: _storeProfile?['phone'] ?? '08123456789',
      invoiceNumber: 'TEST-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      dateTime: DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now()),
      cashierName: 'Admin',
      items: [
        {'name': 'Menu Uji Coba 1', 'quantity': 1, 'price': 15000.0, 'subtotal': 15000.0},
        {'name': 'Menu Uji Coba 2', 'quantity': 2, 'price': 10000.0, 'subtotal': 20000.0},
      ],
      totalAmount: 35000.0,
      paidAmount: 50000.0,
      changeAmount: 15000.0,
      paymentMethod: 'TEST PRINT',
      receiptHeader: '*** UJI COBA PRINTER BERHASIL ***',
      receiptFooter: 'Printer Thermal Siap Digunakan!',
      paperSize: paperSize,
    );

    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Test print berhasil dikirim ke printer!'), backgroundColor: AppColors.success),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Gagal mencetak. Hubungkan printer terlebih dahulu.'),
          backgroundColor: AppColors.warning,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isConnected = widget.printerService.isConnected;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Printer Bluetooth Thermal'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Connection Status Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isConnected ? AppColors.success.withOpacity(0.12) : AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isConnected ? AppColors.success : AppColors.border),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isConnected ? AppColors.success : AppColors.textSecondary,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isConnected ? Icons.print : Icons.print_disabled,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isConnected ? 'Printer Terhubung' : 'Belum Ada Printer Terhubung',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isConnected ? AppColors.success : AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isConnected
                              ? (widget.printerService.connectedDeviceName ?? 'Perangkat Bluetooth')
                              : 'Pindai perangkat di bawah untuk menghubungkan',
                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                  if (isConnected)
                    TextButton(
                      onPressed: () async {
                        await widget.printerService.disconnect();
                        setState(() {});
                      },
                      child: const Text('Putus', style: TextStyle(color: AppColors.error)),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Action Buttons: Scan & Test Print
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isScanning ? null : _requestPermissionsAndScan,
                    icon: _isScanning
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.bluetooth_searching),
                    label: Text(_isScanning ? 'Memindai...' : 'Pindai Printer'),
                  ),
                ),
                if (isConnected) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _testPrint,
                      icon: const Icon(Icons.receipt_long),
                      label: const Text('Test Print'),
                    ),
                  ),
                ],
              ],
            ),

            const SizedBox(height: 20),

            // Discovered Devices Section
            const Text(
              'Perangkat Ditemukan',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),

            if (_scanResults.isEmpty)
              Container(
                padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Center(
                  child: Text(
                    _isScanning
                        ? 'Sedang mencari perangkat Bluetooth...'
                        : 'Klik tombol "Pindai Printer" di atas untuk mencari printer thermal Bluetooth yang aktif.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _scanResults.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final result = _scanResults[index];
                  final name = result.device.platformName.isNotEmpty ? result.device.platformName : 'Perangkat Tanpa Nama';
                  final mac = result.device.remoteId.str;

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.bluetooth, color: AppColors.primary),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              const SizedBox(height: 2),
                              Text(mac, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          ),
                          onPressed: _isConnecting ? null : () => _connectToDevice(result.device),
                          child: const Text('Hubungkan', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
