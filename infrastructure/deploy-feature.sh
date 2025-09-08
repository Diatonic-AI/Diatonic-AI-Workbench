#!/usr/bin/env bash
# AI Nexus Workbench - Feature Deployment Helper Script
# Usage: ./deploy-feature.sh [feature-name] [action]
# Actions: plan, deploy, rollback, status

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_FILE="$SCRIPT_DIR/dynamodb-feature-modules.tf"
BACKUP_DIR="$SCRIPT_DIR/backups"

# Feature mapping
declare -A FEATURES=(
    ["project-management"]="deploy_project_management"
    ["agent-builder"]="deploy_agent_builder"
    ["ai-lab"]="deploy_ai_lab"
    ["community"]="deploy_community"
    ["education"]="deploy_education"
    ["analytics"]="deploy_analytics"
    ["notifications"]="deploy_notifications"
    ["rbac"]="deploy_enhanced_rbac"
)

# Feature descriptions
declare -A DESCRIPTIONS=(
    ["project-management"]="Project Management (4 tables: projects, workspaces, memberships)"
    ["agent-builder"]="Agent Builder (5 tables: agents, versions, flows, templates, prompts)"
    ["ai-lab"]="AI Lab (5 tables: models, datasets, experiments, runs, metrics)"
    ["community"]="Community Platform (5 tables: posts, comments, reactions, groups)"
    ["education"]="Education Center (6 tables: courses, lessons, enrollments, quizzes)"
    ["analytics"]="Analytics & Observatory (2 tables: activity-feed, aggregated-analytics)"
    ["notifications"]="Notifications (2 tables: notifications, subscriptions)"
    ["rbac"]="Enhanced RBAC (2 tables: organization-memberships, role-permissions)"
)

print_usage() {
    echo -e "${BLUE}AI Nexus Workbench - Feature Deployment Helper${NC}"
    echo ""
    echo "Usage: $0 [feature-name] [action]"
    echo ""
    echo -e "${YELLOW}Available Features:${NC}"
    for feature in "${!FEATURES[@]}"; do
        echo "  $feature - ${DESCRIPTIONS[$feature]}"
    done
    echo ""
    echo -e "${YELLOW}Available Actions:${NC}"
    echo "  plan     - Show what would be deployed/changed"
    echo "  deploy   - Deploy the feature tables"
    echo "  rollback - Remove the feature tables (destructive!)"
    echo "  status   - Show current deployment status"
    echo "  list     - List all features and their status"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 project-management plan"
    echo "  $0 agent-builder deploy"
    echo "  $0 list"
}

check_prerequisites() {
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${RED}Error: Terraform is not installed or not in PATH${NC}"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "$TERRAFORM_FILE" ]]; then
        echo -e "${RED}Error: Cannot find $TERRAFORM_FILE${NC}"
        echo "Please run this script from the infrastructure directory"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
}

backup_terraform_state() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/terraform-state-$timestamp.backup"
    
    echo -e "${BLUE}Creating Terraform state backup...${NC}"
    if terraform state pull > "$backup_file" 2>/dev/null; then
        echo -e "${GREEN}Backup created: $backup_file${NC}"
    else
        echo -e "${YELLOW}Warning: Could not create state backup${NC}"
    fi
}

get_current_feature_status() {
    local feature="$1"
    local flag_name="${FEATURES[$feature]}"
    
    # Extract current value from terraform file
    local current_value=$(grep "^[[:space:]]*$flag_name[[:space:]]*=" "$TERRAFORM_FILE" | sed -E 's/.*=[[:space:]]*(true|false).*/\1/' | tr -d ' ')
    echo "$current_value"
}

set_feature_flag() {
    local feature="$1"
    local value="$2"
    local flag_name="${FEATURES[$feature]}"
    
    # Create backup of terraform file
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    cp "$TERRAFORM_FILE" "$BACKUP_DIR/dynamodb-feature-modules-$timestamp.tf.backup"
    
    # Update the flag value
    sed -i.bak "s/^[[:space:]]*$flag_name[[:space:]]*=.*/$flag_name = $value/" "$TERRAFORM_FILE"
    rm "$TERRAFORM_FILE.bak"
    
    echo -e "${GREEN}Updated $flag_name = $value${NC}"
}

run_terraform_plan() {
    echo -e "${BLUE}Running terraform plan...${NC}"
    echo "==============================================="
    
    cd "$SCRIPT_DIR"
    terraform plan -no-color
}

run_terraform_apply() {
    echo -e "${BLUE}Running terraform apply...${NC}"
    echo "==============================================="
    
    cd "$SCRIPT_DIR"
    terraform apply
}

show_feature_status() {
    local feature="${1:-}"
    
    if [[ -n "$feature" ]]; then
        # Show status for specific feature
        if [[ ! -v "FEATURES[$feature]" ]]; then
            echo -e "${RED}Error: Unknown feature '$feature'${NC}"
            exit 1
        fi
        
        local status=$(get_current_feature_status "$feature")
        local status_color="${RED}"
        local status_text="DISABLED"
        
        if [[ "$status" == "true" ]]; then
            status_color="${GREEN}"
            status_text="ENABLED"
        fi
        
        echo -e "${BLUE}Feature Status:${NC}"
        echo -e "  $feature: ${status_color}$status_text${NC} - ${DESCRIPTIONS[$feature]}"
        
    else
        # Show status for all features
        echo -e "${BLUE}All Feature Deployment Status:${NC}"
        echo "=============================================="
        
        for feature in "${!FEATURES[@]}"; do
            local status=$(get_current_feature_status "$feature")
            local status_color="${RED}"
            local status_text="DISABLED"
            
            if [[ "$status" == "true" ]]; then
                status_color="${GREEN}"
                status_text="ENABLED "
            fi
            
            printf "  %-20s ${status_color}%s${NC} - %s\n" "$feature:" "$status_text" "${DESCRIPTIONS[$feature]}"
        done
    fi
}

deploy_feature() {
    local feature="$1"
    local action="$2"
    
    if [[ ! -v "FEATURES[$feature]" ]]; then
        echo -e "${RED}Error: Unknown feature '$feature'${NC}"
        print_usage
        exit 1
    fi
    
    local current_status=$(get_current_feature_status "$feature")
    local target_value="true"
    local action_verb="Deploying"
    
    if [[ "$action" == "rollback" ]]; then
        target_value="false"
        action_verb="Rolling back"
        
        echo -e "${RED}WARNING: This will DELETE all data in the feature tables!${NC}"
        echo -e "${YELLOW}Feature: $feature${NC}"
        echo -e "${YELLOW}Tables: ${DESCRIPTIONS[$feature]}${NC}"
        echo ""
        read -p "Are you sure you want to proceed? (type 'yes' to confirm): " confirm
        
        if [[ "$confirm" != "yes" ]]; then
            echo "Operation cancelled."
            exit 0
        fi
    fi
    
    echo -e "${BLUE}$action_verb feature: $feature${NC}"
    echo -e "${BLUE}Description: ${DESCRIPTIONS[$feature]}${NC}"
    echo ""
    
    # Check current status
    if [[ "$current_status" == "$target_value" ]]; then
        if [[ "$target_value" == "true" ]]; then
            echo -e "${YELLOW}Feature is already enabled. No changes needed.${NC}"
        else
            echo -e "${YELLOW}Feature is already disabled. No changes needed.${NC}"
        fi
        return 0
    fi
    
    # Create backup
    backup_terraform_state
    
    # Update feature flag
    set_feature_flag "$feature" "$target_value"
    
    # Run terraform plan first
    echo ""
    run_terraform_plan
    
    echo ""
    echo -e "${YELLOW}Ready to apply changes. Continue? [y/N]${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        run_terraform_apply
        echo ""
        echo -e "${GREEN}Feature deployment completed successfully!${NC}"
    else
        echo "Deployment cancelled."
        # Revert the flag change
        local revert_value="false"
        if [[ "$target_value" == "false" ]]; then
            revert_value="true"
        fi
        set_feature_flag "$feature" "$revert_value"
        echo -e "${YELLOW}Reverted feature flag to original state.${NC}"
    fi
}

# Main execution
main() {
    check_prerequisites
    
    if [[ $# -eq 0 ]]; then
        print_usage
        exit 0
    fi
    
    local command="$1"
    
    case "$command" in
        "list"|"status")
            show_feature_status
            ;;
        "help"|"--help"|"-h")
            print_usage
            ;;
        *)
            if [[ $# -lt 2 ]]; then
                echo -e "${RED}Error: Missing action parameter${NC}"
                print_usage
                exit 1
            fi
            
            local feature="$1"
            local action="$2"
            
            case "$action" in
                "plan")
                    set_feature_flag "$feature" "true"
                    echo -e "${BLUE}Planning deployment for: $feature${NC}"
                    run_terraform_plan
                    # Revert the change
                    local current=$(get_current_feature_status "$feature")
                    if [[ "$current" == "false" ]]; then
                        set_feature_flag "$feature" "false"
                    fi
                    ;;
                "deploy")
                    deploy_feature "$feature" "deploy"
                    ;;
                "rollback")
                    deploy_feature "$feature" "rollback"
                    ;;
                "status")
                    show_feature_status "$feature"
                    ;;
                *)
                    echo -e "${RED}Error: Unknown action '$action'${NC}"
                    print_usage
                    exit 1
                    ;;
            esac
            ;;
    esac
}

# Run main function with all arguments
main "$@"
