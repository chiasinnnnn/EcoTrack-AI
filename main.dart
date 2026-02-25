
import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:convert';
import 'dart:typed_data';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env"); // Load the API key
  await Firebase.initializeApp();
  runApp(const KitaroApp());
}

class WasteAnalysis {
  final String material;
  final bool recyclable;
  final String instruction;
  final String hazardLevel;

  WasteAnalysis({
    required this.material,
    required this.recyclable,
    required this.instruction,
    required this.hazardLevel,
  });

  factory WasteAnalysis.fromJson(Map<String, dynamic> json) {
    return WasteAnalysis(
      material: json['material'] ?? 'Unknown',
      recyclable: json['recyclable'] ?? false,
      instruction: json['instruction'] ?? '',
      hazardLevel: json['hazard_level'] ?? 'Low',
    );
  }

  Map<String, dynamic> toJson() => {
    'material': material,
    'recyclable': recyclable,
    'instruction': instruction,
    'hazard_level': hazardLevel,
  };
}

class GeminiService {
  static Future<WasteAnalysis> analyzeWasteImage(Uint8List bytes) async {
    final apiKey = dotenv.env['GEMINI_API_KEY'] ?? '';
    final model = GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: apiKey,
      generationConfig: GenerationConfig(
        responseMimeType: 'application/json',
      ),
    );

    const prompt = """
      Analyze this waste item for a user in Malaysia. 
      Identify the exact material.
      Determine if it is recyclable according to the Malaysian Separation at Source (SAS) policy.
      Assess the hazard level (Low, Medium, High).
      Provide clear instructions on how to dispose of it, strictly enforcing the Malaysian SAS bin colors:
      - Blue for Paper
      - Brown for Glass
      - Orange for Plastics/Metals
      - Green/Black for Residual waste
      
      Return the response in a structured JSON format with material, recyclable, instruction, and hazard_level.
    """;

    final content = [
      Content.multi([
        TextPart(prompt),
        DataPart('image/jpeg', bytes),
      ])
    ];

    final response = await model.generateContent(content);
    if (response.text == null) throw Exception("No response from AI");
    
    return WasteAnalysis.fromJson(jsonDecode(response.text!));
  }
}

class KitaroApp extends StatelessWidget {
  const KitaroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF006D3A),
        brightness: Brightness.light,
      ),
      home: const WasteIdentifierPage(),
    );
  }
}

class WasteIdentifierPage extends StatefulWidget {
  const WasteIdentifierPage({super.key});

  @override
  State<WasteIdentifierPage> createState() => _WasteIdentifierPageState();
}

class _WasteIdentifierPageState extends State<WasteIdentifierPage> {
  bool _isLoading = false;
  WasteAnalysis? _result;
  XFile? _image;
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickAndAnalyze() async {
    final XFile? photo = await _picker.pickImage(source: ImageSource.camera);
    if (photo == null) return;

    setState(() {
      _image = photo;
      _isLoading = true;
      _result = null;
    });

    try {
      final bytes = await photo.readAsBytes();
      final analysis = await GeminiService.analyzeWasteImage(bytes);
      
      setState(() {
        _result = analysis;
        _isLoading = false;
      });

      // Save to Firestore (Mocking userId for prototype)
      await _saveToFirestore("user_123", analysis);
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  Future<void> _saveToFirestore(String userId, WasteAnalysis result) async {
    try {
      await FirebaseFirestore.instance.collection('scans').add({
        'userId': userId,
        'material': result.material,
        'recyclable': result.recyclable,
        'hazard_level': result.hazardLevel,
        'instruction': result.instruction,
        'timestamp': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      debugPrint("Firestore Error: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFCFDF7),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Kitaro', style: TextStyle(fontWeight: FontWeight.bold)),
            Text('MALAYSIA SAS AI', style: TextStyle(fontSize: 10, letterSpacing: 1.2)),
          ],
        ),
        actions: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.history)),
          const Padding(
            padding: EdgeInsets.only(right: 16.0),
            child: CircleAvatar(radius: 18, backgroundColor: Color(0xFF99F6B4)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            if (_image == null) ...[
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: const Color(0xFFE8F5E9),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFFC8E6C9)),
                ),
                child: const Column(
                  children: [
                    Text(
                      'Sustainable Malaysia',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF1B5E20)),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Empowering communities with AI-driven Separation at Source (SAS) identification.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: Color(0xFF2E7D32)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Recycling Guide', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 16),
              _buildGuideGrid(),
            ] else ...[
              _buildPreviewSection(),
              if (_result != null) ResultCard(result: _result!),
            ],
          ],
        ),
      ),
      floatingActionButton: _image == null 
        ? FloatingActionButton.large(
            onPressed: _pickAndAnalyze,
            backgroundColor: const Color(0xFF99F6B4),
            child: const Icon(Icons.camera_alt, color: Color(0xFF00210D)),
          )
        : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFFF0F1EB).withOpacity(0.9),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_filled), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.history), label: 'History'),
          NavigationDestination(icon: Icon(Icons.delete_outline), label: 'Bins'),
          NavigationDestination(icon: Icon(Icons.person_outline), label: 'Profile'),
        ],
      ),
    );
  }

  Widget _buildPreviewSection() {
    return Column(
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: IconButton(
            onPressed: () => setState(() { _image = null; _result = null; }),
            icon: const Icon(Icons.arrow_back),
          ),
        ),
        const SizedBox(height: 16),
        ClipRRect(
          borderRadius: BorderRadius.circular(32),
          child: AspectRatio(
            aspectRatio: 4 / 5,
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Image.file would be used in real mobile, but for prototype we use placeholder or bytes
                // Since XFile is used, we can't easily show it here without more logic, 
                // but this is the structure.
                Container(color: Colors.grey[300], child: const Icon(Icons.image, size: 100)),
                if (_isLoading)
                  Container(
                    color: Colors.black45,
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(color: Colors.white),
                        SizedBox(height: 16),
                        Text('AI Thinking...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildGuideGrid() {
    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.2,
      children: [
        _guideItem('Paper', 'Blue Bin', Icons.description, Colors.blue[50]!),
        _guideItem('Glass', 'Brown Bin', Icons.wine_bar, Colors.brown[50]!),
        _guideItem('Plastic/Metal', 'Orange Bin', Icons.liquor, Colors.orange[50]!),
        _guideItem('Residual', 'Green Bin', Icons.delete, Colors.green[50]!),
      ],
    );
  }

  Widget _guideItem(String title, String bin, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.black12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 24),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          Text(bin, style: const TextStyle(fontSize: 10)),
        ],
      ),
    );
  }
}

class ResultCard extends StatelessWidget {
  final WasteAnalysis result;
  const ResultCard({super.key, required this.result});

  Color getBinColor(String instruction) {
    final i = instruction.toLowerCase();
    if (i.contains('blue') || i.contains('paper')) return const Color(0xFF1E88E5);
    if (i.contains('brown') || i.contains('glass')) return const Color(0xFF5D4037);
    if (i.contains('orange') || i.contains('plastic') || i.contains('metal')) return const Color(0xFFFF9800);
    return const Color(0xFF006D3A);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('DETECTED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                  Text(result.material, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: result.recyclable ? Colors.emerald[100] : Colors.red[100],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      result.recyclable ? 'RECYCLABLE' : 'RESIDUAL',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: result.recyclable ? Colors.emerald[800] : Colors.red[800]),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${result.hazardLevel.toUpperCase()} HAZARD',
                    style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: getBinColor(result.instruction),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Icon(Icons.near_me, color: Colors.white54, size: 32),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('SAS DISPOSAL ACTION', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold)),
                      Text(result.instruction, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
