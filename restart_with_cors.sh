#!/bin/bash

# Restart Cedar Agent with CORS support
echo "🔧 Rebuilding Cedar Agent with CORS support..."

# Build the project
cargo build --release

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Kill any existing cedar-agent processes
    pkill -f cedar-agent 2>/dev/null || true
    
    # Start the server with CORS support
    echo "🚀 Starting Cedar Agent with CORS support on port 8280..."
    ./target/release/cedar-agent --port 8280 --authentication cedar-agent-key &
    
    # Wait a moment for the server to start
    sleep 2
    
    # Test if the server is running
    if curl -s http://localhost:8280/ > /dev/null; then
        echo "✅ Cedar Agent is running with CORS support!"
        echo "🌐 API available at: http://localhost:8280"
        echo "📚 API docs at: http://localhost:8280/swagger-ui/"
        echo ""
        echo "Now you can start the frontend:"
        echo "cd frontend && npm run dev"
    else
        echo "❌ Failed to start Cedar Agent"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
