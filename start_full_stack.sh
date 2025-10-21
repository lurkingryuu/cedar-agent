#!/bin/bash

# Cedar Agent Full Stack Startup Script
# This script starts both the Cedar Agent backend and the frontend dashboard

set -e

echo "🚀 Starting Cedar Agent Full Stack..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or higher.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm.${NC}"
    exit 1
fi

# Check if Rust/Cargo is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Cargo is not installed. Please install Rust.${NC}"
    exit 1
fi

# Default values
PORT=${CEDAR_AGENT_PORT:-8180}
AUTH_KEY=${CEDAR_AGENT_AUTHENTICATION:-"cedar-agent-key"}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo -e "${GREEN}📋 Configuration:${NC}"
echo "   Backend Port: $PORT"
echo "   Frontend Port: $FRONTEND_PORT"
echo "   API Key: ${AUTH_KEY:0:10}..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

trap cleanup INT TERM

# Start backend
echo -e "${GREEN}🔧 Starting Cedar Agent Backend...${NC}"
cargo run --release -- --port $PORT --authentication $AUTH_KEY > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:$PORT/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start. Check backend.log for details.${NC}"
        cat backend.log
        cleanup
    fi
    sleep 1
done

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
fi

# Create .env.local if it doesn't exist
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}📝 Creating frontend/.env.local...${NC}"
    cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:$PORT/v1
NEXT_PUBLIC_API_KEY=$AUTH_KEY
EOF
fi

# Start frontend
echo -e "${GREEN}🎨 Starting Frontend Dashboard...${NC}"
cd frontend
PORT=$FRONTEND_PORT npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to be ready
echo -e "${YELLOW}⏳ Waiting for frontend to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:$FRONTEND_PORT/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start. Check frontend.log for details.${NC}"
        cat frontend.log
        cleanup
    fi
    sleep 1
done

echo ""
echo -e "${GREEN}🎉 Cedar Agent Full Stack is running!${NC}"
echo ""
echo -e "${GREEN}Backend API:${NC}      http://localhost:$PORT"
echo -e "${GREEN}Frontend Dashboard:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${GREEN}API Documentation:${NC} http://localhost:$PORT/swagger-ui/"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and show logs
tail -f backend.log frontend.log &
wait

