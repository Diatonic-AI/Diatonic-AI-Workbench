// Lead Management API Client
// TypeScript client for interacting with the lead capture and management system

import { APIGatewayConfig } from '../aws-config';

// Lead data types
export interface LeadData {
  // Required fields
  email: string;
  first_name: string;
  last_name: string;
  
  // Optional contact information
  phone?: string;
  job_title?: string;
  
  // Company information
  company_name?: string;
  company_size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  company_website?: string;
  company_industry?: string;
  
  // Lead qualification
  use_case?: string;
  ai_experience?: 'none' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  current_solution?: string;
  budget_range?: 'under-10k' | '10k-50k' | '50k-100k' | '100k-500k' | '500k-plus';
  urgency?: 'immediate' | 'next-quarter' | 'next-6-months' | 'exploratory';
  team_size?: number;
  
  // Marketing attribution
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  
  // Plan and messaging
  plan_interest?: 'free' | 'professional' | 'enterprise';
  message?: string;
  lead_source?: string;
  
  // Privacy compliance
  consent_marketing?: boolean;
  consent_processing?: boolean;
}

// Lead response from API
export interface Lead extends LeadData {
  lead_id: string;
  created_at: string;
  updated_at: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  priority_score: number;
  sales_rep?: string;
  notes?: string;
}

// Lead activity tracking
export interface LeadActivity {
  lead_id: string;
  activity_id: string;
  activity_timestamp: string;
  activity_type: string;
  activity_data: Record<string, any>;
  created_at: string;
}

// API response types
export interface CreateLeadResponse {
  lead_id: string;
  status: 'created';
  priority_score: number;
  created_at: string;
}

export interface GetLeadResponse {
  lead: Lead;
  activities: LeadActivity[];
}

export interface ListLeadsResponse {
  leads: Lead[];
  count: number;
  lastEvaluatedKey?: Record<string, any>;
  nextPageUrl?: string;
}

export interface UpdateLeadResponse {
  message: string;
  lead_id: string;
  updated_at: string;
}

export interface LeadAnalytics {
  summary: {
    total_leads: number;
    by_status: Record<string, number>;
    recent_leads_30d: number;
  };
  generated_at: string;
}

// API Error handling
export interface APIError {
  error: string;
  message: string;
  missing?: string[];
}

// Lead API query parameters
export interface LeadQueryParams {
  status?: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  limit?: number;
  lastKey?: string;
  company?: string;
  priority_min?: number;
}

// Lead API Client Class
export class LeadAPI {
  private baseURL: string;

  constructor() {
    // Get API Gateway URL from config
    const config = APIGatewayConfig.getInstance();
    this.baseURL = config.getFullEndpoint('/leads');
  }

  /**
   * Create a new lead
   */
  async createLead(leadData: LeadData): Promise<CreateLeadResponse> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(leadData),
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(`Failed to create lead: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Get a specific lead by ID
   */
  async getLead(leadId: string): Promise<GetLeadResponse> {
    const response = await fetch(`${this.baseURL}/${leadId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(`Failed to get lead: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * List leads with optional filtering
   */
  async listLeads(params: LeadQueryParams = {}): Promise<ListLeadsResponse> {
    const queryString = new URLSearchParams();
    
    if (params.status) queryString.set('status', params.status);
    if (params.limit) queryString.set('limit', params.limit.toString());
    if (params.lastKey) queryString.set('lastKey', params.lastKey);
    if (params.company) queryString.set('company', params.company);
    if (params.priority_min) queryString.set('priority_min', params.priority_min.toString());

    const url = queryString.toString() ? 
      `${this.baseURL}?${queryString.toString()}` : 
      this.baseURL;

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(`Failed to list leads: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Update a lead
   */
  async updateLead(leadId: string, updateData: Partial<Lead>): Promise<UpdateLeadResponse> {
    const response = await fetch(`${this.baseURL}/${leadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(`Failed to update lead: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Get lead analytics and statistics
   */
  async getAnalytics(): Promise<LeadAnalytics> {
    const response = await fetch(`${this.baseURL}/analytics`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(`Failed to get analytics: ${error.message}`);
    }

    return await response.json();
  }

  /**
   * Create lead from onboarding form data
   */
  async createLeadFromOnboarding(
    userType: 'individual' | 'company',
    formData: Record<string, any>,
    source: 'onboarding' | 'pricing' = 'onboarding'
  ): Promise<CreateLeadResponse> {
    // Map form data to lead structure
    const leadData: LeadData = {
      email: formData.email,
      first_name: formData.firstName || formData.first_name,
      last_name: formData.lastName || formData.last_name,
      phone: formData.phone,
      job_title: formData.jobTitle || formData.job_title,
      company_name: formData.companyName || formData.company_name,
      company_size: formData.companySize || formData.company_size,
      company_website: formData.companyWebsite || formData.company_website,
      company_industry: formData.industry || formData.company_industry,
      use_case: formData.useCase || formData.use_case,
      ai_experience: formData.aiExperience || formData.ai_experience,
      budget_range: formData.budgetRange || formData.budget_range,
      urgency: formData.urgency,
      team_size: formData.teamSize ? parseInt(formData.teamSize) : undefined,
      message: formData.message,
      lead_source: source,
      plan_interest: formData.planInterest || formData.plan_interest,
      consent_marketing: formData.consentMarketing || false,
      consent_processing: formData.consentProcessing || true,
      
      // Add UTM tracking if available
      utm_source: this.getUTMParam('utm_source'),
      utm_medium: this.getUTMParam('utm_medium'),
      utm_campaign: this.getUTMParam('utm_campaign'),
      referrer: document.referrer || undefined,
    };

    // Set lead source based on user type
    if (userType === 'company') {
      leadData.lead_source = 'enterprise-inquiry';
      leadData.plan_interest = 'enterprise';
    }

    return await this.createLead(leadData);
  }

  /**
   * Create lead from enterprise inquiry (pricing page CTA)
   */
  async createEnterpriseInquiry(
    email: string,
    name: string,
    companyName?: string,
    message?: string
  ): Promise<CreateLeadResponse> {
    const [firstName, ...lastNameParts] = name.split(' ');
    const lastName = lastNameParts.join(' ') || '';

    const leadData: LeadData = {
      email,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName,
      message,
      lead_source: 'enterprise-inquiry',
      plan_interest: 'enterprise',
      consent_processing: true,
      
      // Add UTM tracking
      utm_source: this.getUTMParam('utm_source'),
      utm_medium: this.getUTMParam('utm_medium'),
      utm_campaign: this.getUTMParam('utm_campaign'),
      referrer: document.referrer || undefined,
    };

    return await this.createLead(leadData);
  }

  /**
   * Utility: Extract UTM parameters from URL
   */
  private getUTMParam(paramName: string): string | undefined {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName) || undefined;
  }

  /**
   * Utility: Check if lead already exists by email
   */
  async checkLeadExists(email: string): Promise<boolean> {
    try {
      // This would require a search endpoint, for now we'll try to create and handle the conflict
      const leads = await this.listLeads({ limit: 1 });
      return leads.leads.some(lead => lead.email.toLowerCase() === email.toLowerCase());
    } catch (error) {
      console.warn('Could not check if lead exists:', error);
      return false;
    }
  }

  /**
   * Utility: Format lead for display
   */
  static formatLeadName(lead: Lead): string {
    return `${lead.first_name} ${lead.last_name}`.trim();
  }

  /**
   * Utility: Get priority color for UI display
   */
  static getPriorityColor(score: number): string {
    if (score >= 80) return 'bg-red-100 text-red-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    if (score >= 40) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  }

  /**
   * Utility: Get status color for UI display
   */
  static getStatusColor(status: Lead['status']): string {
    const colors = {
      'new': 'bg-blue-100 text-blue-800',
      'contacted': 'bg-yellow-100 text-yellow-800',
      'qualified': 'bg-green-100 text-green-800',
      'converted': 'bg-purple-100 text-purple-800',
      'lost': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || colors.new;
  }
}

// Export singleton instance
export const leadAPI = new LeadAPI();

// Export types for use in components
export type {
  LeadData,
  Lead,
  LeadActivity,
  CreateLeadResponse,
  GetLeadResponse,
  ListLeadsResponse,
  UpdateLeadResponse,
  LeadAnalytics,
  LeadQueryParams,
  APIError,
};