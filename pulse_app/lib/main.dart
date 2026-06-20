import 'package:flutter/material.dart';

void main() {
  runApp(const PulseApp());
}

class PulseApp extends StatelessWidget {
  const PulseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Pulse — Habit Tracker',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0A0A0A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD0D0D0),
          secondary: Color(0xFF999999),
          surface: Color(0xFF111111),
        ),
        fontFamily: 'SF Mono',
      ),
      home: const PulseScreen(),
    );
  }
}

class PulseScreen extends StatefulWidget {
  const PulseScreen({super.key});

  @override
  State<PulseScreen> createState() => _PulseScreenState();
}

class _PulseScreenState extends State<PulseScreen> {
  int _selectedIndex = 0;

  final pages = const [HabitsView(), StatsView(), ProfileView()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _selectedIndex, children: pages),
      bottomNavigationBar: Container(
        height: 60,
        decoration: const BoxDecoration(
          color: Color(0xFF111111),
          border: Border(top: BorderSide(color: Color(0xFF222222))),
        ),
        child: Row(
          children: [
            _navItem(0, Icons.check_circle_outline, 'Habits'),
            _navItem(1, Icons.bar_chart_outlined, 'Stats'),
            _navItem(2, Icons.person_outline, 'Profile'),
          ],
        ),
      ),
    );
  }

  Widget _navItem(int index, IconData icon, String label) {
    final sel = _selectedIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedIndex = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            border: Border(
              top: BorderSide(
                color: sel ? const Color(0xFFB0B0B0) : Colors.transparent,
                width: 2,
              ),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: sel ? const Color(0xFFB0B0B0) : const Color(0xFF666666), size: 22),
              const SizedBox(height: 2),
              Text(label, style: TextStyle(
                fontSize: 10,
                color: sel ? const Color(0xFFB0B0B0) : const Color(0xFF666666),
                fontWeight: sel ? FontWeight.w600 : FontWeight.w400,
              )),
            ],
          ),
        ),
      ),
    );
  }
}

// ── HABITS VIEW ──
class HabitsView extends StatefulWidget {
  const HabitsView({super.key});

  @override
  State<HabitsView> createState() => _HabitsViewState();
}

Color _habitColor(String name) {
  switch (name) {
    case 'green': return const Color(0xFF22C55E);
    case 'coral': return const Color(0xFFFF6B6B);
    case 'amber': return const Color(0xFFF59E0B);
    case 'blue': return const Color(0xFF3B82F6);
    case 'purple': return const Color(0xFF8B5CF6);
    default: return const Color(0xFFB0B0B0);
  }
}

class _HabitsViewState extends State<HabitsView> {
  List<Map<String, dynamic>> habits = [
    {'name': '🌅 Wake Up Early', 'streak': 14, 'color': 'green', 'week': [1,1,1,1,1,1,1]},
    {'name': '💪 Workout', 'streak': 7, 'color': 'coral', 'week': [1,0,1,1,0,1,0]},
    {'name': '📚 Read 30min', 'streak': 21, 'color': 'amber', 'week': [1,1,0,1,1,0,1]},
    {'name': '🧘 Meditate', 'streak': 5, 'color': 'blue', 'week': [1,1,1,0,1,0,0]},
  ];

  List<int> completedDays = [1,2,3,5,6,7,8,9,10,12,13,14,15,16,17,19,20,21];
  List<int> partialDays = [4,11,18,22,24,26];
  int today = 8;

  final nameCtrl = TextEditingController();
  String newColor = 'green';

  @override
  void dispose() {
    nameCtrl.dispose();
    super.dispose();
  }

  final weekLabels = ['M','T','W','T','F','S','S'];

  void addHabit() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111111),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFF222222)),
        ),
        title: const Text('Track New Habit', style: TextStyle(color: Color(0xFFD0D0D0), fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 14),
              decoration: const InputDecoration(
                hintText: 'Habit name (e.g., 🏃 Run)',
                hintStyle: TextStyle(color: Color(0xFF666666)),
                filled: true, fillColor: Color(0xFF1A1A1A),
                border: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF222222))),
                enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF222222))),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: newColor,
              dropdownColor: const Color(0xFF1A1A1A),
              style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 14),
              decoration: const InputDecoration(
                filled: true, fillColor: Color(0xFF1A1A1A),
                border: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF222222))),
                enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF222222))),
              ),
              items: ['green','coral','amber','blue','purple'].map((c) => DropdownMenuItem(
                value: c,
                child: Row(children: [
                  Container(width: 12, height: 12, decoration: BoxDecoration(color: _habitColor(c), shape: BoxShape.circle)),
                  const SizedBox(width: 8),
                  Text(c[0].toUpperCase() + c.substring(1)),
                ]),
              )).toList(),
              onChanged: (v) => newColor = v!,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel', style: TextStyle(color: Color(0xFF666666)))),
          TextButton(
            onPressed: () {
              if (nameCtrl.text.trim().isNotEmpty) {
                setState(() {
                  habits.add({'name': nameCtrl.text.trim(), 'streak': 0, 'color': newColor, 'week': [0,0,0,0,0,0,0]});
                });
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add', style: TextStyle(color: Color(0xFFB0B0B0), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    int totalDays = 30;
    int rate = totalDays > 0 ? (completedDays.length / totalDays * 100).round() : 0;

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 48, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('PULSE', style: const TextStyle(color: Color(0xFFB0B0B0), fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 2)),
                    const SizedBox(height: 4),
                    Text('Habit Tracker', style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 24, fontWeight: FontWeight.w800)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF222222))),
                  child: Text('🔥 ${completedDays.length} day streak', style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Calendar
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFF111111), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF222222))),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('June 2026', style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 14, fontWeight: FontWeight.w600)),
                      Text('$rate%', style: const TextStyle(color: Color(0xFFB0B0B0), fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Day headers
                  Row(
                    children: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) =>
                      Expanded(child: Center(child: Text(d, style: const TextStyle(color: Color(0xFF666666), fontSize: 10)))))
                    .toList(),
                  ),
                  const SizedBox(height: 8),
                  // Calendar grid rows
                  ...List.generate(5, (row) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: List.generate(7, (col) {
                          int dayNum = row * 7 + col + 1 - 1; // offset: start Monday
                          if (dayNum < 1 || dayNum > 30) return const Expanded(child: SizedBox());

                          bool isCompleted = completedDays.contains(dayNum);
                          bool isPartial = partialDays.contains(dayNum);
                          bool isToday = dayNum == today;

                          Color bg;
                          if (isCompleted) bg = const Color(0xFF22C55E);
                          else if (isPartial) bg = const Color(0xFFF59E0B).withOpacity(0.5);
                          else bg = const Color(0xFF1A1A1A);

                          return Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  if (isCompleted) {
                                    completedDays.remove(dayNum);
                                    partialDays.add(dayNum);
                                  } else if (isPartial) {
                                    partialDays.remove(dayNum);
                                  } else {
                                    completedDays.add(dayNum);
                                  }
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                margin: const EdgeInsets.all(2),
                                height: 36,
                                decoration: BoxDecoration(
                                  color: bg,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: isToday ? const Color(0xFFB0B0B0) : const Color(0xFF222222)),
                                ),
                                child: Center(child: Text('$dayNum', style: TextStyle(
                                  color: isToday ? const Color(0xFFD0D0D0) : const Color(0xFF999999),
                                  fontSize: 11,
                                  fontWeight: isToday ? FontWeight.w700 : FontWeight.w400,
                                ))),
                              ),
                            ),
                          );
                        }),
                      ),
                    );
                  }),
                  const SizedBox(height: 12),
                  // Summary
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _statChip('${completedDays.length}', 'Done', const Color(0xFF22C55E)),
                      _statChip('${partialDays.length}', 'Partial', const Color(0xFFF59E0B)),
                      _statChip('${totalDays - completedDays.length - partialDays.length}', 'Missed', const Color(0xFF666666)),
                      _statChip('$rate%', 'Rate', const Color(0xFFB0B0B0)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Habits list header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Habits', style: TextStyle(color: Color(0xFFD0D0D0), fontSize: 16, fontWeight: FontWeight.w700)),
                GestureDetector(
                  onTap: addHabit,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF222222))),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add, color: Color(0xFFB0B0B0), size: 14),
                        SizedBox(width: 4),
                        Text('Add', style: TextStyle(color: Color(0xFFB0B0B0), fontSize: 12)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Habit cards
            ...habits.map((h) {
              Color color = _habitColor(h['color']);
              int completed = (h['week'] as List<int>).where((d) => d == 1).length;

              return AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFF111111),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF222222)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(children: [
                          Container(width: 3, height: 24, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
                          const SizedBox(width: 10),
                          Text(h['name'], style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 14)),
                        ]),
                        Row(children: [
                          Icon(Icons.local_fire_department, color: (h['streak'] as int) > 0 ? const Color(0xFFFF6B6B) : const Color(0xFF666666), size: 14),
                          const SizedBox(width: 4),
                          Text('${h['streak']}', style: TextStyle(color: (h['streak'] as int) > 0 ? const Color(0xFFFF6B6B) : const Color(0xFF666666), fontSize: 12, fontWeight: FontWeight.w600)),
                        ]),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: List.generate(7, (i) {
                        bool done = (h['week'] as List<int>)[i] == 1;
                        return Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setState(() {
                                List<int> week = h['week'];
                                week[i] = week[i] == 1 ? 0 : 1;
                                h['streak'] = week.where((d) => d == 1).length;
                              });
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              margin: const EdgeInsets.symmetric(horizontal: 2),
                              height: 28,
                              decoration: BoxDecoration(
                                color: done ? color.withOpacity(0.3) : const Color(0xFF1A1A1A),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: done ? color : const Color(0xFF222222)),
                              ),
                              child: Center(child: Text(weekLabels[i], style: TextStyle(
                                color: done ? color : const Color(0xFF666666),
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                              ))),
                            ),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _statChip(String value, String label, Color color) {
    return Column(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 14, fontWeight: FontWeight.w700)),
        Text(label, style: const TextStyle(color: Color(0xFF666666), fontSize: 10)),
      ],
    );
  }
}

// ── STATS VIEW ──
class StatsView extends StatelessWidget {
  const StatsView({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 48, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('STATISTICS', style: TextStyle(color: Color(0xFFB0B0B0), fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 2)),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(child: _statCard('🔥', 'Current Streak', '42', 'days')),
                const SizedBox(width: 8),
                Expanded(child: _statCard('📊', 'Completion Rate', '89%', 'this month')),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _statCard('💪', 'Active Habits', '4', 'tracked')),
                const SizedBox(width: 8),
                Expanded(child: _statCard('⭐', 'Best Streak', '21', 'days')),
              ],
            ),
            const SizedBox(height: 24),
            // Weekly chart
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFF111111), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF222222))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Weekly Activity', style: TextStyle(color: Color(0xFFD0D0D0), fontSize: 14, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 16),
                  ...['Mon','Tue','Wed','Thu','Fri'].asMap().entries.map((entry) {
                    const vals = [75, 90, 60, 85, 95];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          SizedBox(width: 30, child: Text(entry.value, style: const TextStyle(color: Color(0xFF666666), fontSize: 10))),
                          Expanded(
                            child: Container(
                              height: 8,
                              decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(4)),
                              child: FractionallySizedBox(
                                alignment: Alignment.centerLeft,
                                widthFactor: vals[entry.key] / 100,
                                child: Container(decoration: BoxDecoration(color: const Color(0xFFB0B0B0), borderRadius: BorderRadius.circular(4))),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          SizedBox(width: 30, child: Text('${vals[entry.key]}%', style: const TextStyle(color: Color(0xFF999999), fontSize: 10))),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statCard(String icon, String label, String value, String unit) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFF111111), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF222222))),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(icon, style: const TextStyle(fontSize: 24)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 28, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(color: Color(0xFF666666), fontSize: 11)),
          Text(unit, style: const TextStyle(color: Color(0xFF666666), fontSize: 10)),
        ],
      ),
    );
  }
}

// ── PROFILE VIEW ──
class ProfileView extends StatefulWidget {
  const ProfileView({super.key});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  String _name = 'Omer Bin Asif';
  String _handle = '@omer_builds';

  void editProfile() {
    final nc = TextEditingController(text: _name);
    final hc = TextEditingController(text: _handle);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF111111),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFF222222))),
        title: const Text('Edit Profile', style: TextStyle(color: Color(0xFFD0D0D0), fontSize: 16, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nc,
              style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 14),
              decoration: const InputDecoration(
                labelText: 'Name', labelStyle: TextStyle(color: Color(0xFF666666)),
                filled: true, fillColor: Color(0xFF1A1A1A),
                border: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF222222))),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: hc,
              style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 14),
              decoration: const InputDecoration(
                labelText: 'Handle', labelStyle: TextStyle(color: Color(0xFF666666)),
                filled: true, fillColor: Color(0xFF1A1A1A),
                border: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFF222222))),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel', style: TextStyle(color: Color(0xFF666666)))),
          TextButton(
            onPressed: () {
              setState(() {
                if (nc.text.trim().isNotEmpty) _name = nc.text.trim();
                if (hc.text.trim().isNotEmpty) _handle = hc.text.trim();
              });
              Navigator.pop(ctx);
            },
            child: const Text('Save', style: TextStyle(color: Color(0xFFB0B0B0), fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 48, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('PROFILE', style: TextStyle(color: Color(0xFFB0B0B0), fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 2)),
            const SizedBox(height: 20),
            Center(
              child: Column(
                children: [
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1A1A1A),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF222222)),
                    ),
                    child: Center(child: Text(_name.isNotEmpty ? _name[0].toUpperCase() : '?',
                      style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 28, fontWeight: FontWeight.w700))),
                  ),
                  const SizedBox(height: 12),
                  Text(_name, style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(_handle, style: const TextStyle(color: Color(0xFF666666), fontSize: 13)),
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: editProfile,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFF222222))),
                      child: const Text('Edit Profile', style: TextStyle(color: Color(0xFFB0B0B0), fontSize: 12, fontWeight: FontWeight.w500)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(child: _infoCard('42', 'Day Streak', Icons.local_fire_department)),
                const SizedBox(width: 8),
                Expanded(child: _infoCard('89%', 'Rate', Icons.trending_up)),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _infoCard('4', 'Habits', Icons.check_circle_outline)),
                const SizedBox(width: 8),
                Expanded(child: _infoCard('21', 'Best', Icons.emoji_events)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoCard(String value, String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: const Color(0xFF111111), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF222222))),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFB0B0B0), size: 20),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: const TextStyle(color: Color(0xFFD0D0D0), fontSize: 18, fontWeight: FontWeight.w700)),
              Text(label, style: const TextStyle(color: Color(0xFF666666), fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }
}
