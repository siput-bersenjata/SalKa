import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/config.dart';

class ApiService {
  String? _token;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('salka_token');
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('salka_token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('salka_token');
  }

  bool get isLoggedIn => _token != null && _token!.isNotEmpty;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  // ============ AUTH ============

  Future<Map<String, dynamic>> login(String username, String password) async {
    final res = await http.post(
      Uri.parse(AppConfig.apiLogin),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200 && data['token'] != null) {
      await saveToken(data['token']);
    }
    return {'statusCode': res.statusCode, ...data};
  }

  Future<Map<String, dynamic>> register({
    required String username,
    required String password,
    String? fullName,
    String? phone,
    String? storeName,
    String? address,
  }) async {
    final res = await http.post(
      Uri.parse(AppConfig.apiRegister),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'password': password,
        'fullName': fullName,
        'phone': phone,
        'storeName': storeName,
        'address': address,
      }),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200 && data['token'] != null) {
      await saveToken(data['token']);
    }
    return {'statusCode': res.statusCode, ...data};
  }

  Future<Map<String, dynamic>?> getMe() async {
    try {
      final res = await http.get(Uri.parse(AppConfig.apiMe), headers: _headers);
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
    } catch (_) {}
    return null;
  }

  // ============ PRODUCTS ============

  Future<List<dynamic>> getProducts() async {
    try {
      final res = await http.get(Uri.parse(AppConfig.apiProducts), headers: _headers);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return data['products'] ?? [];
      }
    } catch (_) {}
    return [];
  }

  Future<Map<String, dynamic>> addProduct(Map<String, dynamic> product) async {
    final res = await http.post(
      Uri.parse(AppConfig.apiProducts),
      headers: _headers,
      body: jsonEncode(product),
    );
    return {'statusCode': res.statusCode, ...jsonDecode(res.body)};
  }

  Future<Map<String, dynamic>> updateProduct(String id, Map<String, dynamic> product) async {
    final res = await http.put(
      Uri.parse('${AppConfig.apiProducts}/$id'),
      headers: _headers,
      body: jsonEncode(product),
    );
    return {'statusCode': res.statusCode, ...jsonDecode(res.body)};
  }

  Future<bool> deleteProduct(String id) async {
    final res = await http.delete(
      Uri.parse('${AppConfig.apiProducts}/$id'),
      headers: _headers,
    );
    return res.statusCode == 200;
  }

  // ============ CATEGORIES ============

  Future<List<dynamic>> getCategories() async {
    try {
      final res = await http.get(Uri.parse(AppConfig.apiCategories), headers: _headers);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return data['categories'] ?? [];
      }
    } catch (_) {}
    return [];
  }

  // ============ TRANSACTIONS ============

  Future<Map<String, dynamic>> createTransaction({
    required List<Map<String, dynamic>> items,
    required double paidAmount,
    String paymentMethod = 'CASH',
    String? customerName,
    String? notes,
  }) async {
    final res = await http.post(
      Uri.parse(AppConfig.apiTransactions),
      headers: _headers,
      body: jsonEncode({
        'items': items,
        'paidAmount': paidAmount,
        'paymentMethod': paymentMethod,
        'customerName': customerName,
        'notes': notes,
      }),
    );
    return {'statusCode': res.statusCode, ...jsonDecode(res.body)};
  }

  Future<Map<String, dynamic>> getTransactions({int page = 1, int limit = 50}) async {
    try {
      final res = await http.get(
        Uri.parse('${AppConfig.apiTransactions}?page=$page&limit=$limit'),
        headers: _headers,
      );
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
    } catch (_) {}
    return {'transactions': [], 'pagination': {}};
  }

  // ============ STORE PROFILE ============

  Future<Map<String, dynamic>?> getStoreProfile() async {
    try {
      final res = await http.get(Uri.parse(AppConfig.apiStoreProfile), headers: _headers);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return data['store'];
      }
    } catch (_) {}
    return null;
  }

  Future<Map<String, dynamic>> updateStoreProfile(Map<String, dynamic> data) async {
    final res = await http.put(
      Uri.parse(AppConfig.apiStoreProfile),
      headers: _headers,
      body: jsonEncode(data),
    );
    return {'statusCode': res.statusCode, ...jsonDecode(res.body)};
  }
}
