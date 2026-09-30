import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/sync_service.dart';
import '../utils/theme.dart';
import 'login_screen.dart';

class StoreSettingsScreen extends StatefulWidget {
  final ApiService apiService;
  final SyncService syncService;

  const StoreSettingsScreen({
    super.key,
    required this.apiService,
    required this.syncService,
  });

  @override
  State<StoreSettingsScreen> createState() => _StoreSettingsScreenState();
}

class _StoreSettingsScreenState extends State<StoreSettingsScreen> {
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  final _headerController = TextEditingController();
  final _footerController = TextEditingController();

  String _paperSize = '58mm';
  bool _isLoading = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _loadStoreProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _phoneController.dispose();
    _headerController.dispose();
    _footerController.dispose();
    super.dispose();
  }

  Future<void> _loadStoreProfile() async {
    final cached = widget.syncService.profile;
    if (cached != null) {
      _applyProfile(cached);
    } else {
      setState(() => _isLoading = true);
      try {
        final store = await widget.apiService.getStoreProfile();
        if (store != null && mounted) {
          _applyProfile(store);
        }
      } catch (_) {}
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _applyProfile(Map<String, dynamic> store) {
    _nameController.text = store['name'] ?? '';
    _addressController.text = store['address'] ?? '';
    _phoneController.text = store['phone'] ?? '';
    _headerController.text = store['receiptHeader'] ?? '';
    _footerController.text = store['receiptFooter'] ?? '';
    _paperSize = store['receiptPaperSize'] == '80mm' ? '80mm' : '58mm';
  }

  Future<void> _saveSettings() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama Toko tidak boleh kosong!')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final payload = {
        'name': name,
        'address': _addressController.text.trim().isNotEmpty ? _addressController.text.trim() : null,
        'phone': _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
        'receiptPaperSize': _paperSize,
        'receiptHeader': _headerController.text.trim().isNotEmpty ? _headerController.text.trim() : null,
        'receiptFooter': _footerController.text.trim().isNotEmpty ? _footerController.text.trim() : null,
      };

      await widget.syncService.updateStoreProfileLocal(payload);

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pengaturan toko & struk berhasil disimpan (tersimpan lokal & sinkron cloud)!'),
          backgroundColor: AppColors.success,
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Terjadi kesalahan: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Keluar dari Akun?'),
        content: const Text('Anda akan keluar dari sesi kasir pada perangkat ini.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Keluar'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await widget.apiService.clearToken();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => LoginScreen(apiService: widget.apiService)),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pengaturan Toko & Kertas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.error),
            tooltip: 'Logout Kasir',
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Section: Identitas Toko
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.storefront, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text('Profil Toko', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _nameController,
                          decoration: const InputDecoration(
                            labelText: 'Nama Toko *',
                            hintText: 'Contoh: KasirKu Mart',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _addressController,
                          decoration: const InputDecoration(
                            labelText: 'Alamat Toko',
                            hintText: 'Jl. Ahmad Yani No. 12',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(
                            labelText: 'Nomor Telepon / WhatsApp',
                            hintText: '081234567890',
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Section: Pengaturan Kertas Thermal & Struk
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.print_rounded, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text('Pengaturan Kertas & Struk', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 16),

                        const Text('Ukuran Kertas Thermal Printer:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () => setState(() => _paperSize = '58mm'),
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  decoration: BoxDecoration(
                                    color: _paperSize == '58mm' ? AppColors.primary.withOpacity(0.1) : AppColors.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: _paperSize == '58mm' ? AppColors.primary : AppColors.border,
                                      width: _paperSize == '58mm' ? 2 : 1,
                                    ),
                                  ),
                                  child: Column(
                                    children: [
                                      Icon(
                                        Icons.receipt,
                                        color: _paperSize == '58mm' ? AppColors.primary : AppColors.textSecondary,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '58 mm (Standar)',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: _paperSize == '58mm' ? AppColors.primary : AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      const Text('Mini Thermal POS', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: InkWell(
                                onTap: () => setState(() => _paperSize = '80mm'),
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  decoration: BoxDecoration(
                                    color: _paperSize == '80mm' ? AppColors.primary.withOpacity(0.1) : AppColors.surface,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: _paperSize == '80mm' ? AppColors.primary : AppColors.border,
                                      width: _paperSize == '80mm' ? 2 : 1,
                                    ),
                                  ),
                                  child: Column(
                                    children: [
                                      Icon(
                                        Icons.receipt_long,
                                        color: _paperSize == '80mm' ? AppColors.primary : AppColors.textSecondary,
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '80 mm (Lebar)',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: _paperSize == '80mm' ? AppColors.primary : AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      const Text('Printer Kasir Besar', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),
                        TextField(
                          controller: _headerController,
                          decoration: const InputDecoration(
                            labelText: 'Pesan Header Struk (Opsional)',
                            hintText: 'Selamat datang di toko kami!',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _footerController,
                          decoration: const InputDecoration(
                            labelText: 'Pesan Footer Struk (Opsional)',
                            hintText: 'Terima kasih atas kunjungan Anda!',
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),

                  ElevatedButton(
                    onPressed: _isSaving ? null : _saveSettings,
                    child: _isSaving
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Simpan Pengaturan Toko', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
    );
  }
}
