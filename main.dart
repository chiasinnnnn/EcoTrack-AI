
import 'package:flutter/material.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:camera/camera.dart';
import 'dart:convert';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const KitaroApp());
}

class KitaroApp extends StatelessWidget {
  const KitaroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: const Color(0xFF006D3A),
        fontFamily: 'Plus Jakarta Sans',
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
  Map<String, dynamic>? _result;

  Future<void> _analyzeImage(XFile image) async {
    setState(() => _isLoading = true);
    
    final model = GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: 'YOUR_API_KEY',
    );

    final bytes = await image.readAsBytes();
    final content = [
      Content.multi([
        TextPart("Analyze this waste for Malaysia SAS policy. Return JSON with material, recyclable, instruction."),
        DataPart('image/jpeg', bytes),
      ])
    ];

    final response = await model.generateContent(content);
    if (response.text != null) {
      setState(() {
        _result = jsonDecode(response.text!);
        _isLoading = false;
      });
      // Future: Save to Firebase
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kitaro Malaysia')),
      body: Center(
        child: _isLoading 
          ? const CircularProgressIndicator()
          : _result == null 
            ? const Text("Snap a photo to begin")
            : ResultCard(data: _result!),
      ),
      floatingActionButton: FloatingActionButton.large(
        onPressed: () { /* Camera logic */ },
        child: const Icon(Icons.camera_alt),
      ),
      bottomNavigationBar: NavigationBar(
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.history), label: 'History'),
          NavigationDestination(icon: Icon(Icons.map), label: 'Bins'),
          NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class ResultCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const ResultCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(20),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(data['material'], style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 10),
            Text(data['instruction']),
          ],
        ),
      ),
    );
  }
}
