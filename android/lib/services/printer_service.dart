import 'dart:typed_data';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';

class PrinterService {
  BluetoothDevice? _connectedDevice;
  BluetoothCharacteristic? _writeCharacteristic;
  bool _isConnected = false;

  bool get isConnected => _isConnected;
  String? get connectedDeviceName => _connectedDevice?.platformName;

  // Scan for Bluetooth thermal printers
  Future<List<ScanResult>> scanDevices({Duration timeout = const Duration(seconds: 5)}) async {
    List<ScanResult> results = [];
    
    // Start scanning
    await FlutterBluePlus.startScan(timeout: timeout);
    
    // Listen to scan results
    results = FlutterBluePlus.lastScanResults;
    
    await FlutterBluePlus.stopScan();
    return results;
  }

  // Connect to a Bluetooth printer
  Future<bool> connect(BluetoothDevice device) async {
    try {
      await device.connect(timeout: const Duration(seconds: 10));
      _connectedDevice = device;

      // Discover services and find the writable characteristic
      List<BluetoothService> services = await device.discoverServices();
      for (var service in services) {
        for (var char in service.characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            _writeCharacteristic = char;
            break;
          }
        }
        if (_writeCharacteristic != null) break;
      }

      _isConnected = _writeCharacteristic != null;
      return _isConnected;
    } catch (e) {
      _isConnected = false;
      return false;
    }
  }

  // Disconnect from printer
  Future<void> disconnect() async {
    try {
      await _connectedDevice?.disconnect();
    } catch (_) {}
    _connectedDevice = null;
    _writeCharacteristic = null;
    _isConnected = false;
  }

  // Print raw bytes
  Future<void> _writeBytes(List<int> bytes) async {
    if (_writeCharacteristic == null) return;

    // Send in chunks of 100 bytes (BLE limit)
    const chunkSize = 100;
    for (var i = 0; i < bytes.length; i += chunkSize) {
      final end = (i + chunkSize > bytes.length) ? bytes.length : i + chunkSize;
      final chunk = bytes.sublist(i, end);
      await _writeCharacteristic!.write(Uint8List.fromList(chunk), withoutResponse: true);
      await Future.delayed(const Duration(milliseconds: 20));
    }
  }

  // Print a receipt
  Future<bool> printReceipt({
    required String storeName,
    String? storeAddress,
    String? storePhone,
    required String invoiceNumber,
    required String dateTime,
    required String cashierName,
    required List<Map<String, dynamic>> items,
    required double totalAmount,
    required double paidAmount,
    required double changeAmount,
    required String paymentMethod,
    String? receiptHeader,
    String? receiptFooter,
    String paperSize = '58mm',
  }) async {
    if (!_isConnected || _writeCharacteristic == null) return false;

    try {
      final profile = await CapabilityProfile.load();
      final width = paperSize == '80mm' ? PaperSize.mm80 : PaperSize.mm58;
      final generator = Generator(width, profile);
      List<int> bytes = [];

      // ===== HEADER =====
      bytes += generator.reset();
      bytes += generator.text(
        storeName,
        styles: const PosStyles(align: PosAlign.center, bold: true, height: PosTextSize.size2, width: PosTextSize.size2),
      );

      if (storeAddress != null && storeAddress.isNotEmpty) {
        bytes += generator.text(storeAddress, styles: const PosStyles(align: PosAlign.center));
      }
      if (storePhone != null && storePhone.isNotEmpty) {
        bytes += generator.text('Telp: $storePhone', styles: const PosStyles(align: PosAlign.center));
      }

      bytes += generator.hr(ch: '=');

      // ===== INVOICE INFO =====
      if (invoiceNumber.trim().isNotEmpty) {
        bytes += generator.text('No: $invoiceNumber', styles: const PosStyles(bold: true));
      }
      bytes += generator.text('Tgl: $dateTime');
      bytes += generator.text('Kasir: $cashierName');
      bytes += generator.hr();

      // ===== ITEMS =====
      for (var item in items) {
        final name = item['productName'] ?? item['name'] ?? 'Item';
        final qty = item['quantity'] ?? 1;
        final price = (item['price'] ?? 0).toDouble();
        final subtotal = (item['subtotal'] ?? (price * qty)).toDouble();

        bytes += generator.text(name, styles: const PosStyles(bold: true));
        bytes += generator.row([
          PosColumn(
            text: '  $qty x Rp ${_formatRupiah(price)}',
            width: 8,
          ),
          PosColumn(
            text: 'Rp ${_formatRupiah(subtotal)}',
            width: 4,
            styles: const PosStyles(align: PosAlign.right),
          ),
        ]);
      }

      bytes += generator.hr();

      // ===== TOTAL =====
      bytes += generator.row([
        PosColumn(text: 'TOTAL', width: 6, styles: const PosStyles(bold: true, height: PosTextSize.size2)),
        PosColumn(
          text: 'Rp ${_formatRupiah(totalAmount)}',
          width: 6,
          styles: const PosStyles(align: PosAlign.right, bold: true, height: PosTextSize.size2),
        ),
      ]);

      bytes += generator.row([
        PosColumn(text: 'Bayar ($paymentMethod)', width: 6),
        PosColumn(text: 'Rp ${_formatRupiah(paidAmount)}', width: 6, styles: const PosStyles(align: PosAlign.right)),
      ]);

      if (changeAmount > 0) {
        bytes += generator.row([
          PosColumn(text: 'Kembalian', width: 6),
          PosColumn(text: 'Rp ${_formatRupiah(changeAmount)}', width: 6, styles: const PosStyles(align: PosAlign.right)),
        ]);
      }

      bytes += generator.hr(ch: '=');

      // ===== FOOTER =====
      if (receiptHeader != null && receiptHeader.isNotEmpty) {
        bytes += generator.text(receiptHeader, styles: const PosStyles(align: PosAlign.center));
      }
      if (receiptFooter != null && receiptFooter.isNotEmpty) {
        bytes += generator.text(receiptFooter, styles: const PosStyles(align: PosAlign.center));
      }

      bytes += generator.text(
        'Dicetak oleh KasirKu v${1}.0',
        styles: const PosStyles(align: PosAlign.center),
      );

      bytes += generator.feed(3);
      bytes += generator.cut();

      await _writeBytes(bytes);
      return true;
    } catch (e) {
      return false;
    }
  }

  String _formatRupiah(double value) {
    final intVal = value.toInt();
    final str = intVal.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) {
        buffer.write('.');
      }
      buffer.write(str[i]);
    }
    return buffer.toString();
  }
}
