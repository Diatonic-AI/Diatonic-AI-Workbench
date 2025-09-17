#!/bin/bash
# AI Nexus Workbench - Lead Management Infrastructure Deployment
# Deploys the lead capture system with DynamoDB tables, Lambda function, and API Gateway

set -euo pipefail

# Configuration
ENVIRONMENT=${1:-dev}
AWS_REGION=${AWS_REGION:-us-east-2}
AWS_PROFILE=${AWS_PROFILE:-default}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
validate_environment() {
    echo_info "Validating deployment environment..."
    
    if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
        echo_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
        exit 1
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        echo_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        echo_error "Terraform is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        echo_error "AWS credentials not configured for profile: $AWS_PROFILE"
        exit 1
    fi
    
    echo_success "Environment validation passed"
}

# Install Lambda dependencies
install_lambda_dependencies() {
    echo_info "Installing Lambda function dependencies..."
    
    local lambda_dir="../backend/lambda-leads"
    
    if [[ ! -d "$lambda_dir" ]]; then
        echo_error "Lambda directory not found: $lambda_dir"
        exit 1
    fi
    
    cd "$lambda_dir"
    
    # Install Node.js dependencies
    if [[ -f "package.json" ]]; then
        npm install --production
        echo_success "Lambda dependencies installed"
    else
        echo_warning "No package.json found in Lambda directory"
    fi
    
    cd - > /dev/null
}

# Deploy infrastructure
deploy_infrastructure() {
    echo_info "Deploying lead management infrastructure..."
    
    local infra_dir="../infrastructure"
    
    if [[ ! -d "$infra_dir" ]]; then
        echo_error "Infrastructure directory not found: $infra_dir"
        exit 1
    fi
    
    cd "$infra_dir"
    
    # Initialize Terraform if needed
    if [[ ! -d ".terraform" ]]; then
        echo_info "Initializing Terraform..."
        terraform init
    fi
    
    # Select or create workspace
    if ! terraform workspace select "$ENVIRONMENT" 2>/dev/null; then
        echo_info "Creating Terraform workspace: $ENVIRONMENT"
        terraform workspace new "$ENVIRONMENT"
    fi
    
    # Plan deployment
    echo_info "Planning Terraform deployment..."
    terraform plan \
        -var="environment=$ENVIRONMENT" \
        -var="aws_region=$AWS_REGION" \
        -out="tfplan-leads-$ENVIRONMENT"
    
    # Apply deployment
    echo_info "Applying Terraform deployment..."
    terraform apply "tfplan-leads-$ENVIRONMENT"
    
    # Clean up plan file
    rm -f "tfplan-leads-$ENVIRONMENT"
    
    cd - > /dev/null
    
    echo_success "Infrastructure deployment completed"
}

# Test deployment
test_deployment() {
    echo_info "Testing lead management API deployment..."
    
    cd "../infrastructure"
    
    # Get API Gateway endpoint
    local api_endpoint
    api_endpoint=$(terraform output -raw api_gateway_invoke_url 2>/dev/null || echo "")
    
    if [[ -z "$api_endpoint" ]]; then
        echo_warning "Could not retrieve API Gateway endpoint"
        cd - > /dev/null
        return
    fi
    
    echo_info "API Endpoint: $api_endpoint"
    
    # Test health check (if available)
    local health_url="${api_endpoint}${ENVIRONMENT}/health"
    
    echo_info "Testing API health check..."
    if curl -s -f "$health_url" > /dev/null; then
        echo_success "API health check passed"
    else
        echo_warning "API health check failed or not available"
    fi
    
    # Test leads endpoint (basic connectivity)
    local leads_url="${api_endpoint}${ENVIRONMENT}/leads"
    
    echo_info "Testing leads endpoint connectivity..."
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$leads_url")
    
    if [[ "$response_code" == "200" ]]; then
        echo_success "Leads endpoint is accessible (OPTIONS request)"
    else
        echo_warning "Leads endpoint returned status code: $response_code"
    fi
    
    cd - > /dev/null
    
  echo "✅ Deployment testing completed"
}

# Update frontend configuration
update_frontend_configuration() {
  echo_info "Updating frontend configuration with deployed API endpoints..."
  
  # Check if frontend update script exists
  if [[ ! -f "./update-frontend-config.sh" ]]; then
    echo_warning "Frontend configuration script not found - you'll need to update manually"
    return
  fi
  
  # Run frontend configuration update
  if ./update-frontend-config.sh update "$ENVIRONMENT"; then
    echo_success "Frontend configuration updated successfully"
  else
    echo_warning "Frontend configuration update failed - please run manually:"
    echo_info "  cd scripts && ./update-frontend-config.sh update $ENVIRONMENT"
  fi
}

# Display deployment info
display_deployment_info() {
    echo_info "Retrieving deployment information..."
    
    cd "../infrastructure"
    
    echo ""
    echo "============================================"
    echo "  LEAD MANAGEMENT DEPLOYMENT SUMMARY"
    echo "============================================"
    echo "Environment: $ENVIRONMENT"
    echo "AWS Region: $AWS_REGION"
    echo "AWS Profile: $AWS_PROFILE"
    echo ""
    
    # Display Terraform outputs
    echo "📋 Infrastructure Resources:"
    echo "----------------------------"
    
    # DynamoDB Tables
    local leads_table
    leads_table=$(terraform output -json leads_table 2>/dev/null | jq -r '.name // "N/A"' 2>/dev/null || echo "N/A")
    echo "Leads Table: $leads_table"
    
    local activities_table
    activities_table=$(terraform output -json lead_activities_table 2>/dev/null | jq -r '.name // "N/A"' 2>/dev/null || echo "N/A")
    echo "Activities Table: $activities_table"
    
    # Lambda Function
    local lambda_function
    lambda_function=$(terraform output -json leads_lambda 2>/dev/null | jq -r '.function_name // "N/A"' 2>/dev/null || echo "N/A")
    echo "Lambda Function: $lambda_function"
    
    # API Endpoints
    echo ""
    echo "🔗 API Endpoints:"
    echo "-----------------"
    
    if terraform output leads_api_endpoints &>/dev/null; then
        echo "Base URL: $(terraform output -json leads_api_endpoints 2>/dev/null | jq -r '.base_url // "N/A"' 2>/dev/null || echo "N/A")"
        echo "Create Lead: POST $(terraform output -json leads_api_endpoints 2>/dev/null | jq -r '.create_lead // "N/A"' 2>/dev/null || echo "N/A")"
        echo "List Leads: GET $(terraform output -json leads_api_endpoints 2>/dev/null | jq -r '.list_leads // "N/A"' 2>/dev/null || echo "N/A")"
        echo "Analytics: GET $(terraform output -json leads_api_endpoints 2>/dev/null | jq -r '.analytics // "N/A"' 2>/dev/null || echo "N/A")"
    else
        echo "API endpoints not available (check Terraform outputs)"
    fi
    
    echo ""
    echo "🔧 Next Steps:"
    echo "--------------"
    echo "1. Update frontend API configuration with the new endpoint URLs"
    echo "2. Test lead creation through the UI"
    echo "3. Configure monitoring and alerting for the Lambda function"
    echo "4. Set up CloudWatch dashboards for lead analytics"
    echo ""
    
    cd - > /dev/null
}

# Main deployment process
main() {
    echo_info "Starting lead management infrastructure deployment..."
    echo_info "Environment: $ENVIRONMENT"
    echo_info "AWS Region: $AWS_REGION"
    echo_info "AWS Profile: $AWS_PROFILE"
    echo ""
    
    # Run deployment steps
    validate_environment
    install_lambda_dependencies
    deploy_infrastructure
    test_deployment
  display_deployment_info
  
  # Update frontend configuration
  update_frontend_configuration
  
  echo ""
  echo_success "🎉 Lead management infrastructure deployment completed successfully!"
  echo_info "You can now start capturing leads through the pricing page and onboarding flow."
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "plan")
        validate_environment
        cd "../infrastructure"
        terraform workspace select "$ENVIRONMENT" 2>/dev/null || terraform workspace new "$ENVIRONMENT"
        terraform plan -var="environment=$ENVIRONMENT" -var="aws_region=$AWS_REGION"
        cd - > /dev/null
        ;;
    "destroy")
        echo_warning "This will destroy the lead management infrastructure in $ENVIRONMENT environment"
        read -p "Are you sure? (yes/no): " -r
        if [[ $REPLY == "yes" ]]; then
            cd "../infrastructure"
            terraform workspace select "$ENVIRONMENT"
            terraform destroy -var="environment=$ENVIRONMENT" -var="aws_region=$AWS_REGION"
            cd - > /dev/null
            echo_success "Infrastructure destroyed"
        else
            echo_info "Destroy cancelled"
        fi
        ;;
    "outputs")
        cd "../infrastructure"
        terraform workspace select "$ENVIRONMENT" 2>/dev/null
        terraform output
        cd - > /dev/null
        ;;
    "help")
        echo "Usage: $0 [command] [environment]"
        echo ""
        echo "Commands:"
        echo "  deploy    - Deploy lead management infrastructure (default)"
        echo "  plan      - Show deployment plan without applying"
        echo "  destroy   - Destroy lead management infrastructure"
        echo "  outputs   - Show Terraform outputs"
        echo "  help      - Show this help message"
        echo ""
        echo "Environments:"
        echo "  dev       - Development environment (default)"
        echo "  staging   - Staging environment"
        echo "  prod      - Production environment"
        echo ""
        echo "Examples:"
        echo "  $0 deploy dev"
        echo "  $0 plan prod"
        echo "  $0 outputs staging"
        ;;
    *)
        echo_error "Unknown command: $1"
        echo_info "Run '$0 help' for usage information"
        exit 1
        ;;
esac