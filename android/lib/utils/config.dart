// API Configuration
class AppConfig {
  // Change this to your Vercel deployment URL
  static const String baseUrl = 'https://salka-alpha.vercel.app';
  
  // API Endpoints
  static const String apiLogin = '$baseUrl/api/auth/login';
  static const String apiRegister = '$baseUrl/api/auth/register';
  static const String apiMe = '$baseUrl/api/auth/me';
  static const String apiProducts = '$baseUrl/api/products';
  static const String apiCategories = '$baseUrl/api/categories';
  static const String apiTransactions = '$baseUrl/api/transactions';
  static const String apiStoreProfile = '$baseUrl/api/store/profile';
  static const String apiReportsSummary = '$baseUrl/api/reports/summary';
  
  // App Info
  static const String appName = 'KasirKu';
  static const String appVersion = '1.0.0';
}
