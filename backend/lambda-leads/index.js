// AI Nexus Workbench - Lead Management Lambda
// Handles lead capture, retrieval, and sales pipeline management

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-2'
});

// Table names from environment
const LEADS_TABLE = process.env.LEADS_TABLE;
const LEAD_ACTIVITIES_TABLE = process.env.LEAD_ACTIVITIES_TABLE;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

// Response helper
const createResponse = (statusCode, body, additionalHeaders = {}) => ({
  statusCode,
  headers: { ...corsHeaders, ...additionalHeaders },
  body: JSON.stringify(body)
});

// Lead priority scoring algorithm
const calculatePriorityScore = (leadData) => {
  let score = 50; // Base score

  // Company size scoring
  const companySize = leadData.company_size || 'unknown';
  const companySizeScores = {
    'startup': 20,
    'small': 30,
    'medium': 50,
    'large': 70,
    'enterprise': 90,
    'unknown': 25
  };
  score += companySizeScores[companySize] || 25;

  // Budget range scoring  
  const budget = leadData.budget_range || 'unknown';
  const budgetScores = {
    'under-10k': 10,
    '10k-50k': 30,
    '50k-100k': 50,
    '100k-500k': 70,
    '500k-plus': 90,
    'unknown': 20
  };
  score += budgetScores[budget] || 20;

  // Use case urgency
  const urgency = leadData.urgency || 'unknown';
  const urgencyScores = {
    'immediate': 30,
    'next-quarter': 20,
    'next-6-months': 10,
    'exploratory': 5,
    'unknown': 0
  };
  score += urgencyScores[urgency] || 0;

  // Contact information completeness
  if (leadData.phone) score += 10;
  if (leadData.job_title) score += 10;
  if (leadData.company_website) score += 5;

  // Enterprise plan interest
  if (leadData.lead_source === 'enterprise-inquiry') score += 20;
  if (leadData.plan_interest === 'enterprise') score += 15;

  return Math.min(score, 100); // Cap at 100
};

// Lead creation
const createLead = async (event) => {
  try {
    const leadData = JSON.parse(event.body);

    // Validate required fields
    const requiredFields = ['email', 'first_name', 'last_name'];
    const missingFields = requiredFields.filter(field => !leadData[field]);
    
    if (missingFields.length > 0) {
      return createResponse(400, {
        error: 'Missing required fields',
        missing: missingFields
      });
    }

    // Check for existing lead by email
    try {
      const existingLead = await dynamodb.query({
        TableName: LEADS_TABLE,
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': leadData.email
        },
        Limit: 1
      }).promise();

      if (existingLead.Items && existingLead.Items.length > 0) {
        return createResponse(409, {
          error: 'Lead already exists',
          existing_lead_id: existingLead.Items[0].lead_id
        });
      }
    } catch (error) {
      console.warn('Error checking existing lead:', error);
      // Continue with lead creation if lookup fails
    }

    // Generate lead ID and timestamps
    const leadId = uuidv4();
    const now = new Date().toISOString();
    const priorityScore = calculatePriorityScore(leadData);

    // Prepare lead record
    const leadRecord = {
      lead_id: leadId,
      created_at: now,
      updated_at: now,
      status: 'new',
      priority_score: priorityScore,
      lead_source: leadData.lead_source || 'website',
      
      // Contact information
      email: leadData.email,
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      phone: leadData.phone || null,
      job_title: leadData.job_title || null,
      
      // Company information
      company_name: leadData.company_name || null,
      company_size: leadData.company_size || null,
      company_website: leadData.company_website || null,
      company_industry: leadData.company_industry || null,
      
      // Lead qualification
      use_case: leadData.use_case || null,
      ai_experience: leadData.ai_experience || null,
      current_solution: leadData.current_solution || null,
      budget_range: leadData.budget_range || null,
      urgency: leadData.urgency || null,
      team_size: leadData.team_size || null,
      
      // Marketing attribution
      utm_source: leadData.utm_source || null,
      utm_medium: leadData.utm_medium || null,
      utm_campaign: leadData.utm_campaign || null,
      referrer: leadData.referrer || null,
      
      // Plan interest
      plan_interest: leadData.plan_interest || null,
      message: leadData.message || null,
      
      // GDPR/Privacy compliance
      consent_marketing: leadData.consent_marketing || false,
      consent_processing: leadData.consent_processing || true,
      
      // TTL (expire after 2 years unless converted)
      expires_at: Math.floor((new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000)) / 1000)
    };

    // Save lead to DynamoDB
    await dynamodb.put({
      TableName: LEADS_TABLE,
      Item: leadRecord,
      ConditionExpression: 'attribute_not_exists(lead_id)'
    }).promise();

    // Log initial activity
    await logLeadActivity(leadId, 'lead_created', {
      source: leadRecord.lead_source,
      priority_score: priorityScore,
      created_by: 'system'
    });

    // Return success response (exclude sensitive internal data)
    const publicResponse = {
      lead_id: leadId,
      status: 'created',
      priority_score: priorityScore,
      created_at: now
    };

    return createResponse(201, publicResponse);

  } catch (error) {
    console.error('Error creating lead:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: 'Failed to create lead'
    });
  }
};

// Lead retrieval (by ID or filters)
const getLeads = async (event) => {
  try {
    const pathParams = event.pathParameters || {};
    const queryParams = event.queryStringParameters || {};
    
    // Get single lead by ID
    if (pathParams.leadId) {
      const result = await dynamodb.get({
        TableName: LEADS_TABLE,
        Key: {
          lead_id: pathParams.leadId,
          created_at: queryParams.created_at || ''
        }
      }).promise();

      if (!result.Item) {
        return createResponse(404, { error: 'Lead not found' });
      }

      // Get lead activities
      const activities = await dynamodb.query({
        TableName: LEAD_ACTIVITIES_TABLE,
        KeyConditionExpression: 'lead_id = :lead_id',
        ExpressionAttributeValues: {
          ':lead_id': pathParams.leadId
        },
        ScanIndexForward: false, // Most recent first
        Limit: 50
      }).promise();

      return createResponse(200, {
        lead: result.Item,
        activities: activities.Items || []
      });
    }

    // List leads with filters
    let queryParams_parsed = queryParams || {};
    const status = queryParams_parsed.status || 'new';
    const limit = parseInt(queryParams_parsed.limit) || 25;
    const lastKey = queryParams_parsed.lastKey ? JSON.parse(decodeURIComponent(queryParams_parsed.lastKey)) : null;

    let queryExpression = {
      TableName: LEADS_TABLE,
      IndexName: 'status-index',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      },
      Limit: limit,
      ScanIndexForward: false // Most recent first
    };

    if (lastKey) {
      queryExpression.ExclusiveStartKey = lastKey;
    }

    // Add filters
    if (queryParams_parsed.company) {
      queryExpression.FilterExpression = 'contains(company_name, :company)';
      queryExpression.ExpressionAttributeValues[':company'] = queryParams_parsed.company;
    }

    if (queryParams_parsed.priority_min) {
      const filterExpr = queryExpression.FilterExpression || '';
      queryExpression.FilterExpression = filterExpr ? 
        `${filterExpr} AND priority_score >= :priority_min` : 
        'priority_score >= :priority_min';
      queryExpression.ExpressionAttributeValues[':priority_min'] = parseInt(queryParams_parsed.priority_min);
    }

    const result = await dynamodb.query(queryExpression).promise();

    const response = {
      leads: result.Items || [],
      count: result.Items?.length || 0,
      lastEvaluatedKey: result.LastEvaluatedKey || null
    };

    if (result.LastEvaluatedKey) {
      response.nextPageUrl = `?status=${status}&limit=${limit}&lastKey=${encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))}`;
    }

    return createResponse(200, response);

  } catch (error) {
    console.error('Error retrieving leads:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: 'Failed to retrieve leads'
    });
  }
};

// Update lead status and information
const updateLead = async (event) => {
  try {
    const pathParams = event.pathParameters || {};
    const updateData = JSON.parse(event.body);

    if (!pathParams.leadId) {
      return createResponse(400, { error: 'Lead ID required' });
    }

    // Get existing lead first
    const existingLead = await dynamodb.query({
      TableName: LEADS_TABLE,
      KeyConditionExpression: 'lead_id = :lead_id',
      ExpressionAttributeValues: {
        ':lead_id': pathParams.leadId
      },
      Limit: 1
    }).promise();

    if (!existingLead.Items || existingLead.Items.length === 0) {
      return createResponse(404, { error: 'Lead not found' });
    }

    const currentLead = existingLead.Items[0];
    const now = new Date().toISOString();

    // Prepare update expression
    let updateExpression = 'SET updated_at = :updated_at';
    let expressionAttributeValues = {
      ':updated_at': now
    };
    let expressionAttributeNames = {};

    // Updatable fields
    const updatableFields = {
      'status': 'status',
      'sales_rep': 'sales_rep',
      'lead_source': 'lead_source',
      'notes': 'notes',
      'phone': 'phone',
      'job_title': 'job_title',
      'company_name': 'company_name',
      'company_size': 'company_size',
      'use_case': 'use_case',
      'budget_range': 'budget_range',
      'urgency': 'urgency'
    };

    Object.keys(updatableFields).forEach(key => {
      if (updateData.hasOwnProperty(key)) {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        
        updateExpression += `, ${attrName} = ${attrValue}`;
        expressionAttributeNames[attrName] = updatableFields[key];
        expressionAttributeValues[attrValue] = updateData[key];
      }
    });

    // Recalculate priority score if relevant fields changed
    if (updateData.company_size || updateData.budget_range || updateData.urgency) {
      const updatedData = { ...currentLead, ...updateData };
      const newPriorityScore = calculatePriorityScore(updatedData);
      updateExpression += ', priority_score = :priority_score';
      expressionAttributeValues[':priority_score'] = newPriorityScore;
    }

    // Perform update
    await dynamodb.update({
      TableName: LEADS_TABLE,
      Key: {
        lead_id: currentLead.lead_id,
        created_at: currentLead.created_at
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined
    }).promise();

    // Log activity for significant changes
    if (updateData.status && updateData.status !== currentLead.status) {
      await logLeadActivity(pathParams.leadId, 'status_changed', {
        old_status: currentLead.status,
        new_status: updateData.status,
        sales_rep: updateData.sales_rep || 'system'
      });
    }

    return createResponse(200, {
      message: 'Lead updated successfully',
      lead_id: pathParams.leadId,
      updated_at: now
    });

  } catch (error) {
    console.error('Error updating lead:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: 'Failed to update lead'
    });
  }
};

// Log lead activity
const logLeadActivity = async (leadId, activityType, activityData) => {
  try {
    const activityId = uuidv4();
    const now = new Date().toISOString();

    const activityRecord = {
      lead_id: leadId,
      activity_id: activityId,
      activity_timestamp: now,
      activity_type: activityType,
      activity_data: activityData,
      created_at: now,
      expires_at: Math.floor((new Date().getTime() + (2 * 365 * 24 * 60 * 60 * 1000)) / 1000) // 2 years
    };

    await dynamodb.put({
      TableName: LEAD_ACTIVITIES_TABLE,
      Item: activityRecord
    }).promise();

  } catch (error) {
    console.error('Error logging lead activity:', error);
    // Don't throw - activity logging is non-critical
  }
};

// Lead analytics (summary stats)
const getLeadAnalytics = async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString();

    // Get leads by status
    const statusCounts = {};
    const statuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    
    for (const status of statuses) {
      const result = await dynamodb.query({
        TableName: LEADS_TABLE,
        IndexName: 'status-index',
        KeyConditionExpression: 'status = :status',
        ExpressionAttributeValues: { ':status': status },
        Select: 'COUNT'
      }).promise();
      statusCounts[status] = result.Count;
    }

    // Get recent leads count (last 30 days)
    const recentLeadsResult = await dynamodb.query({
      TableName: LEADS_TABLE,
      IndexName: 'status-index',
      KeyConditionExpression: 'status = :status AND created_at >= :date',
      ExpressionAttributeValues: {
        ':status': 'new',
        ':date': thirtyDaysAgo
      },
      Select: 'COUNT'
    }).promise();

    return createResponse(200, {
      summary: {
        total_leads: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
        by_status: statusCounts,
        recent_leads_30d: recentLeadsResult.Count
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting lead analytics:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: 'Failed to retrieve analytics'
    });
  }
};

// Main Lambda handler
exports.handler = async (event) => {
  console.log('Lead management request:', JSON.stringify({
    httpMethod: event.httpMethod,
    path: event.path,
    pathParameters: event.pathParameters,
    queryStringParameters: event.queryStringParameters
  }));

  // Handle preflight OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    const method = event.httpMethod;
    const path = event.path;

    // Route requests
    if (method === 'POST' && path === '/leads') {
      return await createLead(event);
    }
    
    if (method === 'GET' && path === '/leads') {
      return await getLeads(event);
    }
    
    if (method === 'GET' && path.match(/^\/leads\/[^/]+$/)) {
      return await getLeads(event);
    }
    
    if (method === 'PUT' && path.match(/^\/leads\/[^/]+$/)) {
      return await updateLead(event);
    }
    
    if (method === 'GET' && path === '/leads/analytics') {
      return await getLeadAnalytics();
    }

    // Route not found
    return createResponse(404, {
      error: 'Route not found',
      method: method,
      path: path
    });

  } catch (error) {
    console.error('Unhandled error in lead handler:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
};