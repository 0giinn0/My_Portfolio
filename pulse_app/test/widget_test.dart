import 'package:flutter_test/flutter_test.dart';
import 'package:pulse_app/main.dart';

void main() {
  testWidgets('Pulse app renders', (WidgetTester tester) async {
    await tester.pumpWidget(const PulseApp());
    expect(find.text('Habits'), findsOneWidget);
    expect(find.text('Stats'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
  });
}
