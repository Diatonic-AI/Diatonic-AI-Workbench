#!/usr/bin/env bash

# =============================================================================
# CI/CD Pipeline Validation Script
# Tests GitHub Actions workflows, AWS connectivity, and deployment readiness
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMEOUT=30

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

# Validation functions
validate_environment() {
    log_section "Environment Validation"
    
    local errors=0
    
    # Check if we're in a git repository
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        log_error "Not in a Git repository"
        ((errors++))
    else
        log_success "Git repository detected"
    fi
    
    # Check for required files
    local required_files=(
        ".github/workflows/deploy-amplify.yml"
        ".github/workflows/deploy-dev.yml"
        "amplify.yml"
        "package.json"
        ".env.example"
        ".gitignore"
    )
    
    for file in "${required_files[@]}"; do
        if [[ -f "$PROJECT_ROOT/$file" ]]; then
            log_success "Found: $file"
        else
            log_error "Missing: $file"
            ((errors++))
        fi
    done
    
    # Check GitHub remote
    if git remote get-url origin >/dev/null 2>&1; then
        local remote_url=$(git remote get-url origin)
        log_success "GitHub remote configured: $remote_url"
    else
        log_error "No GitHub remote configured"
        ((errors++))
    fi
    
    return $errors
}

validate_nodejs_environment() {
    log_section "Node.js Environment"
    
    local errors=0
    
    # Check Node.js version
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        log_success "Node.js version: $node_version"
        
        # Check if version is compatible (Node 18+)
        local major_version=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)
        if [[ $major_version -ge 18 ]]; then
            log_success "Node.js version is compatible"
        else
            log_warning "Node.js version may be too old (recommended: 18+)"
        fi
    else
        log_error "Node.js not found"
        ((errors++))
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        log_success "npm version: $npm_version"
    else
        log_error "npm not found"
        ((errors++))
    fi
    
    # Check package.json scripts
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        local required_scripts=("build" "dev" "lint")
        for script in "${required_scripts[@]}"; do
            if jq -e ".scripts.$script" "$PROJECT_ROOT/package.json" >/dev/null 2>&1; then
                log_success "Package script found: $script"
            else
                log_warning "Package script missing: $script"
            fi
        done
    fi
    
    return $errors
}

validate_aws_configuration() {
    log_section "AWS Configuration"
    
    local errors=0
    
    # Check AWS CLI
    if command -v aws >/dev/null 2>&1; then
        local aws_version=$(aws --version 2>&1 | head -1)
        log_success "AWS CLI found: $aws_version"
        
        # Test AWS credentials (if available)
        if aws sts get-caller-identity >/dev/null 2>&1; then
            local account_id=$(aws sts get-caller-identity --query Account --output text)
            log_success "AWS credentials valid (Account: $account_id)"
        else
            log_warning "AWS credentials not configured (required for local testing)"
        fi
    else
        log_warning "AWS CLI not found (optional for frontend-only builds)"
    fi
    
    # Check Amplify CLI
    if command -v amplify >/dev/null 2>&1; then
        local amplify_version=$(amplify --version 2>&1 | head -1)
        log_success "Amplify CLI found: $amplify_version"
    else
        log_warning "Amplify CLI not found (optional for local deployment)"
    fi
    
    return $errors
}

validate_build_process() {
    log_section "Build Process Validation"
    
    local errors=0
    
    cd "$PROJECT_ROOT"
    
    # Check if node_modules exists
    if [[ -d "node_modules" ]]; then
        log_success "Dependencies already installed"
    else
        log_info "Installing dependencies..."
        if npm ci --silent; then
            log_success "Dependencies installed successfully"
        else
            log_error "Failed to install dependencies"
            ((errors++))
            return $errors
        fi
    fi
    
    # Test TypeScript compilation
    log_info "Testing TypeScript compilation..."
    if npx tsc --noEmit; then
        log_success "TypeScript compilation passed"
    else
        log_error "TypeScript compilation failed"
        ((errors++))
    fi
    
    # Test ESLint
    log_info "Running ESLint..."
    if npm run lint; then
        log_success "ESLint checks passed"
    else
        log_warning "ESLint found issues (may not be critical)"
    fi
    
    # Test build process
    log_info "Testing production build..."
    if timeout $TIMEOUT npm run build; then
        log_success "Production build completed successfully"
        
        # Check build output
        if [[ -d "dist" ]]; then
            local build_size=$(du -sh dist | cut -f1)
            log_success "Build output generated: $build_size"
        else
            log_error "Build output directory not found"
            ((errors++))
        fi
    else
        log_error "Production build failed or timed out"
        ((errors++))
    fi
    
    return $errors
}

validate_github_workflows() {
    log_section "GitHub Workflows Validation"
    
    local errors=0
    
    # Validate workflow YAML syntax
    local workflows=(".github/workflows/deploy-amplify.yml" ".github/workflows/deploy-dev.yml")
    
    for workflow in "${workflows[@]}"; do
        if [[ -f "$PROJECT_ROOT/$workflow" ]]; then
            log_info "Validating workflow: $workflow"
            
            # Check YAML syntax
            if python3 -c "import yaml; yaml.safe_load(open('$PROJECT_ROOT/$workflow'))" 2>/dev/null; then
                log_success "YAML syntax valid: $workflow"
            else
                log_error "YAML syntax invalid: $workflow"
                ((errors++))
            fi
            
            # Check for required secrets
            local required_secrets=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY" "AMPLIFY_APP_ID")
            for secret in "${required_secrets[@]}"; do
                if grep -q "$secret" "$PROJECT_ROOT/$workflow"; then
                    log_success "Secret reference found: $secret"
                else
                    log_warning "Secret not referenced in workflow: $secret"
                fi
            done
        fi
    done
    
    return $errors
}

validate_amplify_config() {
    log_section "AWS Amplify Configuration"
    
    local errors=0
    
    if [[ -f "$PROJECT_ROOT/amplify.yml" ]]; then
        log_success "amplify.yml found"
        
        # Check YAML syntax
        if python3 -c "import yaml; yaml.safe_load(open('$PROJECT_ROOT/amplify.yml'))" 2>/dev/null; then
            log_success "amplify.yml syntax is valid"
        else
            log_error "amplify.yml syntax is invalid"
            ((errors++))
        fi
        
        # Check for required sections
        local required_sections=("frontend" "version")
        for section in "${required_sections[@]}"; do
            if grep -q "$section:" "$PROJECT_ROOT/amplify.yml"; then
                log_success "Section found in amplify.yml: $section"
            else
                log_error "Section missing in amplify.yml: $section"
                ((errors++))
            fi
        done
    else
        log_error "amplify.yml not found"
        ((errors++))
    fi
    
    return $errors
}

test_local_development() {
    log_section "Local Development Environment"
    
    local errors=0
    
    cd "$PROJECT_ROOT"
    
    # Start development server in background
    log_info "Starting development server..."
    npm run dev &
    local dev_pid=$!
    
    # Wait for server to start
    sleep 10
    
    # Test if server is responding
    if curl -f -s http://localhost:8080 >/dev/null; then
        log_success "Development server is responding"
    else
        log_error "Development server is not responding"
        ((errors++))
    fi
    
    # Clean up
    kill $dev_pid 2>/dev/null || true
    sleep 2
    
    return $errors
}

check_github_repository() {
    log_section "GitHub Repository Status"
    
    local errors=0
    
    # Check if repository exists and is accessible
    if git ls-remote --heads origin >/dev/null 2>&1; then
        log_success "GitHub repository is accessible"
        
        # Check branch status
        local current_branch=$(git branch --show-current)
        log_info "Current branch: $current_branch"
        
        # Check if there are uncommitted changes
        if git diff-index --quiet HEAD -- 2>/dev/null; then
            log_success "Working directory is clean"
        else
            log_warning "Working directory has uncommitted changes"
        fi
        
        # Check if we're behind remote
        git fetch origin >/dev/null 2>&1
        local behind_count=$(git rev-list --count HEAD..origin/$current_branch 2>/dev/null || echo "0")
        if [[ $behind_count -eq 0 ]]; then
            log_success "Branch is up to date with remote"
        else
            log_warning "Branch is $behind_count commits behind remote"
        fi
    else
        log_error "Cannot access GitHub repository"
        ((errors++))
    fi
    
    return $errors
}

generate_report() {
    local total_errors=$1
    
    log_section "Validation Summary"
    
    if [[ $total_errors -eq 0 ]]; then
        log_success "All validations passed! CI/CD pipeline is ready."
        echo -e "\n${GREEN}✅ Next steps:${NC}"
        echo "1. Configure GitHub repository secrets (see docs/GITHUB_SECRETS_SETUP.md)"
        echo "2. Set up AWS Amplify app and domain"
        echo "3. Configure Cloudflare DNS (see docs/CLOUDFLARE_DNS_SETUP.md)"
        echo "4. Test deployment by creating a pull request"
        return 0
    else
        log_error "Found $total_errors validation errors"
        echo -e "\n${RED}❌ Issues to resolve:${NC}"
        echo "1. Fix the validation errors listed above"
        echo "2. Re-run this script to verify fixes"
        echo "3. Check documentation in docs/ directory for detailed setup guides"
        return 1
    fi
}

# Main execution
main() {
    log_info "Starting CI/CD Pipeline Validation"
    log_info "Project: $(basename "$PROJECT_ROOT")"
    log_info "Date: $(date)"
    
    local total_errors=0
    
    # Run all validations
    validate_environment || ((total_errors += $?))
    validate_nodejs_environment || ((total_errors += $?))
    validate_aws_configuration || ((total_errors += $?))
    validate_github_workflows || ((total_errors += $?))
    validate_amplify_config || ((total_errors += $?))
    check_github_repository || ((total_errors += $?))
    
    # Conditional validations (only if basic setup is correct)
    if [[ $total_errors -lt 5 ]]; then
        validate_build_process || ((total_errors += $?))
        # test_local_development || ((total_errors += $?))  # Commented out to avoid hanging
    else
        log_warning "Skipping build validation due to previous errors"
    fi
    
    # Generate final report
    generate_report $total_errors
    
    return $?
}

# Handle script arguments
case "${1:-validate}" in
    "validate"|"")
        main
        ;;
    "help"|"--help"|"-h")
        echo "Usage: $0 [validate|help]"
        echo ""
        echo "Validates CI/CD pipeline configuration and readiness"
        echo ""
        echo "Commands:"
        echo "  validate    Run all validations (default)"
        echo "  help        Show this help message"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
