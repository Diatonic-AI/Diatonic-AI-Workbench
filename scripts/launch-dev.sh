#!/usr/bin/env bash
# AI Nexus Workbench Dev Server Launcher
# Launches the dev server in a new terminal window
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_NAME="$(basename "$0")"

echo -e "${BLUE}🚀 AI Nexus Workbench Dev Server Launcher${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Function to detect available terminal emulator
detect_terminal() {
    local terminals=(
        "gnome-terminal"
        "konsole" 
        "xfce4-terminal"
        "mate-terminal"
        "lxterminal"
        "xterm"
        "kitty"
        "alacritty"
        "terminator"
        "tilix"
    )
    
    for term in "${terminals[@]}"; do
        if command -v "$term" >/dev/null 2>&1; then
            echo "$term"
            return 0
        fi
    done
    
    return 1
}

# Function to launch in specific terminal
launch_in_terminal() {
    local terminal="$1"
    local project_dir="$2"
    
    # Create a startup script to avoid complex quoting issues
    local startup_script="/tmp/dev-server-startup-$$.sh"
    cat > "$startup_script" << 'SCRIPT_EOF'
#!/usr/bin/env bash
echo -e '\033[0;32m🚀 Starting AI Nexus Workbench Dev Server\033[0m'
echo ""
echo "📁 Project Directory: $(pwd)"
echo "⏱️  Starting dev server..."
echo ""

# Run the dev server directly (vite)
npm run dev:direct

# Keep terminal open after server stops
echo ""
echo "🛑 Dev server stopped. Press any key to close terminal..."
read -n 1 -s
SCRIPT_EOF
    chmod +x "$startup_script"
    
    case "$terminal" in
        "gnome-terminal")
            gnome-terminal --working-directory="$project_dir" \
                          --title="AI Nexus Dev Server" \
                          -- bash -c "$startup_script"
            ;;
        "konsole")
            konsole --workdir "$project_dir" \
                   --title "AI Nexus Dev Server" \
                   -e bash -c "$startup_script"
            ;;
        "xfce4-terminal")
            xfce4-terminal --working-directory="$project_dir" \
                          --title="AI Nexus Dev Server" \
                          --command="bash -c '$startup_script'"
            ;;
        "mate-terminal")
            mate-terminal --working-directory="$project_dir" \
                         --title="AI Nexus Dev Server" \
                         --command="bash -c '$startup_script'"
            ;;
        "lxterminal")
            lxterminal --working-directory="$project_dir" \
                      --title="AI Nexus Dev Server" \
                      --command="bash -c '$startup_script'"
            ;;
        "terminator")
            terminator --working-directory="$project_dir" \
                      --title="AI Nexus Dev Server" \
                      --command="bash -c '$startup_script'"
            ;;
        "tilix")
            tilix --working-directory="$project_dir" \
                 --title="AI Nexus Dev Server" \
                 --command="bash -c '$startup_script'"
            ;;
        "kitty")
            kitty --directory="$project_dir" \
                  --title="AI Nexus Dev Server" \
                  bash -c "$startup_script"
            ;;
        "alacritty")
            alacritty --working-directory "$project_dir" \
                     --title "AI Nexus Dev Server" \
                     --command bash -c "$startup_script"
            ;;
        "xterm")
            xterm -T "AI Nexus Dev Server" \
                  -e "cd '$project_dir' && bash '$startup_script'"
            ;;
        *)
            echo -e "${RED}❌ Unsupported terminal: $terminal${NC}"
            rm -f "$startup_script"
            return 1
            ;;
    esac
    
    # Clean up startup script after a delay
    (sleep 5 && rm -f "$startup_script") &
}

# Function to check if dev server is already running
check_existing_dev_server() {
    local ports=(8080 8081 8082 8083 8084 8085 8086 8087 8088 8089)
    
    for port in "${ports[@]}"; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            local process_info=$(lsof -i ":$port" 2>/dev/null | grep LISTEN | head -1)
            if echo "$process_info" | grep -q "node\|vite\|npm"; then
                echo -e "${YELLOW}⚠️  Dev server may already be running on port $port${NC}"
                echo -e "${YELLOW}   Process: $(echo "$process_info" | awk '{print $1, $2}')${NC}"
                echo ""
                read -p "Continue anyway? (y/N): " -n 1 -r
                echo ""
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    echo -e "${BLUE}ℹ️  Launch cancelled${NC}"
                    exit 0
                fi
                break
            fi
        fi
    done
}

# Function to verify project setup
verify_project_setup() {
    echo -e "${BLUE}🔍 Verifying project setup...${NC}"
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
        echo -e "${RED}❌ package.json not found. Are you in the AI Nexus Workbench directory?${NC}"
        exit 1
    fi
    
    # Check if node_modules exists
    if [[ ! -d "$PROJECT_DIR/node_modules" ]]; then
        echo -e "${YELLOW}⚠️  node_modules not found. Running npm install...${NC}"
        cd "$PROJECT_DIR"
        npm install
    fi
    
    # Check if DynamoDB Local is running
    if ! docker ps | grep -q dynamodb-local; then
        echo -e "${YELLOW}⚠️  DynamoDB Local not detected. Starting...${NC}"
        cd "$PROJECT_DIR"
        if [[ -x "./scripts/dynamodb-local.sh" ]]; then
            ./scripts/dynamodb-local.sh start
            sleep 3
        else
            echo -e "${YELLOW}⚠️  DynamoDB Local script not found, continuing without it...${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ Project setup verified${NC}"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}📁 Project Directory: $PROJECT_DIR${NC}"
    echo ""
    
    # Verify project setup
    verify_project_setup
    
    # Check for existing dev server
    check_existing_dev_server
    
    # Detect terminal emulator
    echo -e "${BLUE}🔍 Detecting terminal emulator...${NC}"
    local terminal
    if terminal=$(detect_terminal); then
        echo -e "${GREEN}✅ Found terminal: $terminal${NC}"
    else
        echo -e "${RED}❌ No supported terminal emulator found${NC}"
        echo -e "${YELLOW}💡 Supported terminals: gnome-terminal, konsole, xfce4-terminal, mate-terminal,${NC}"
        echo -e "${YELLOW}   lxterminal, terminator, tilix, kitty, alacritty, xterm${NC}"
        echo ""
        echo -e "${BLUE}💡 Falling back to background process...${NC}"
        echo -e "${YELLOW}⚠️  Dev server will run in background. Use 'pkill -f \"npm run dev\"' to stop.${NC}"
        
        cd "$PROJECT_DIR"
        nohup npm run dev:direct > dev-server.log 2>&1 &
        local pid=$!
        echo -e "${GREEN}✅ Dev server started in background (PID: $pid)${NC}"
        echo -e "${BLUE}📝 Logs: $PROJECT_DIR/dev-server.log${NC}"
        echo -e "${BLUE}🔍 Monitor with: tail -f $PROJECT_DIR/dev-server.log${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${BLUE}🚀 Launching dev server in new terminal...${NC}"
    
    # Launch in detected terminal
    if launch_in_terminal "$terminal" "$PROJECT_DIR"; then
        echo -e "${GREEN}✅ Dev server launched successfully!${NC}"
        echo ""
        echo -e "${BLUE}📋 What happens next:${NC}"
        echo -e "${BLUE}  1. A new terminal window will open${NC}"
        echo -e "${BLUE}  2. The dev server will start automatically${NC}"
        echo -e "${BLUE}  3. Your app will be available at http://localhost:808X${NC}"
        echo -e "${BLUE}  4. This terminal remains free for other tasks${NC}"
        echo ""
        echo -e "${YELLOW}💡 To stop the dev server: Close the new terminal or press Ctrl+C in it${NC}"
        if docker ps | grep -q dynamodb-local; then
            echo -e "${BLUE}🔧 DynamoDB Admin UI: http://localhost:8001${NC}"
        fi
    else
        echo -e "${RED}❌ Failed to launch terminal${NC}"
        echo ""
        echo -e "${BLUE}💡 Falling back to direct execution...${NC}"
        echo -e "${YELLOW}⚠️  This will block the current terminal${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd "$PROJECT_DIR"
            npm run dev:direct
        fi
    fi
}

# Handle command line arguments
case "${1:-}" in
    "--help"|"-h")
        echo "AI Nexus Workbench Dev Server Launcher"
        echo ""
        echo "Usage: $SCRIPT_NAME [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h        Show this help message"
        echo "  --background, -b  Run in background mode (no new terminal)"
        echo "  --verify, -v      Only verify setup, don't launch"
        echo ""
        echo "This script:"
        echo "  1. Verifies project setup (dependencies, DynamoDB)"
        echo "  2. Detects available terminal emulator"
        echo "  3. Launches dev server in new terminal window"
        echo "  4. Keeps current terminal free for other tasks"
        exit 0
        ;;
    "--background"|"-b")
        echo -e "${BLUE}🔄 Running in background mode...${NC}"
        verify_project_setup
        cd "$PROJECT_DIR"
        nohup npm run dev:direct > dev-server.log 2>&1 &
        local pid=$!
        echo -e "${GREEN}✅ Dev server started in background (PID: $pid)${NC}"
        echo -e "${BLUE}📝 Logs: $PROJECT_DIR/dev-server.log${NC}"
        echo -e "${BLUE}🔍 Monitor with: tail -f $PROJECT_DIR/dev-server.log${NC}"
        exit 0
        ;;
    "--verify"|"-v")
        verify_project_setup
        echo -e "${GREEN}✅ Setup verification complete${NC}"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        echo -e "${BLUE}💡 Use --help for usage information${NC}"
        exit 1
        ;;
esac
