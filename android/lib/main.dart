import 'package:flutter/material.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/main_navigation_screen.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final apiService = ApiService();
  await apiService.loadToken();

  runApp(KasirKuApp(apiService: apiService));
}

class KasirKuApp extends StatelessWidget {
  final ApiService apiService;
  const KasirKuApp({super.key, required this.apiService});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KasirKu SalKa',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: apiService.isLoggedIn
          ? MainNavigationScreen(apiService: apiService)
          : LoginScreen(apiService: apiService),
    );
  }
}
