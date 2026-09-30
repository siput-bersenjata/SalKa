import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'services/api_service.dart';
import 'screens/login_screen.dart';
import 'screens/main_navigation_screen.dart';
import 'utils/theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Configure system overlays so navigation buttons never obstruct app UI
  await SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.manual,
    overlays: [SystemUiOverlay.top, SystemUiOverlay.bottom],
  );
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
      systemNavigationBarDividerColor: AppColors.border,
    ),
  );

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
