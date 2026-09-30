import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/printer_service.dart';
import '../utils/theme.dart';
import 'pos_screen.dart';
import 'history_screen.dart';
import 'products_screen.dart';
import 'printer_settings_screen.dart';
import 'store_settings_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final ApiService apiService;
  const MainNavigationScreen({super.key, required this.apiService});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  late final PrinterService _printerService;
  late final List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _printerService = PrinterService();
    _screens = [
      PosScreen(apiService: widget.apiService, printerService: _printerService),
      HistoryScreen(apiService: widget.apiService, printerService: _printerService),
      ProductsScreen(apiService: widget.apiService),
      PrinterSettingsScreen(printerService: _printerService, apiService: widget.apiService),
      StoreSettingsScreen(apiService: widget.apiService),
    ];
  }

  @override
  void dispose() {
    _printerService.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textSecondary,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.point_of_sale_rounded),
              label: 'Kasir',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_rounded),
              label: 'Transaksi',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.inventory_2_rounded),
              label: 'Produk/Stok',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.print_rounded),
              label: 'Printer',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.storefront_rounded),
              label: 'Toko',
            ),
          ],
        ),
      ),
    );
  }
}
