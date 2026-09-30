import 'package:flutter_test/flutter_test.dart';
import 'package:salka_pos/main.dart';
import 'package:salka_pos/services/api_service.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    final apiService = ApiService();
    await tester.pumpWidget(KasirKuApp(apiService: apiService));
    expect(find.text('KasirKu POS'), findsOneWidget);
  });
}
