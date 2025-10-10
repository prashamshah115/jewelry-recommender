// Test script to verify Ollama is working
// Run with: node test-local-model.js

const endpoint = process.env.VITE_LOCAL_MODEL_ENDPOINT || 'http://localhost:11434';

async function testOllama() {
  console.log('🔍 Testing Ollama connection...\n');
  
  try {
    // Test 1: Check if Ollama is running
    console.log('1. Checking if Ollama is running...');
    const tagsResponse = await fetch(`${endpoint}/api/tags`);
    
    if (!tagsResponse.ok) {
      throw new Error('Ollama is not running');
    }
    
    const tags = await tagsResponse.json();
    console.log('✅ Ollama is running!');
    console.log('📦 Available models:', tags.models.map(m => m.name).join(', '));
    
    if (tags.models.length === 0) {
      console.log('\n⚠️  No models installed. Run: ollama pull mistral');
      return;
    }
    
    // Test 2: Try generating text
    const modelName = tags.models[0].name;
    console.log(`\n2. Testing generation with ${modelName}...`);
    
    const generateResponse = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: 'Explain neural networks in one sentence.',
        stream: false,
      }),
    });
    
    if (!generateResponse.ok) {
      throw new Error('Generation failed');
    }
    
    const result = await generateResponse.json();
    console.log('✅ Generation works!');
    console.log('📝 Response:', result.response);
    
    console.log('\n🎉 Local model is fully configured and working!');
    console.log(`\n💡 Using endpoint: ${endpoint}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Install Ollama: brew install ollama (macOS)');
    console.log('2. Start server: ollama serve');
    console.log('3. Pull a model: ollama pull mistral');
    console.log('4. Try again!\n');
  }
}

testOllama();

