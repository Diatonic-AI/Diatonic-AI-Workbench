#!/usr/bin/env node

/**
 * Production-Ready DynamoDB Local Setup Script
 * 
 * Generated from production schemas on 2025-09-16T19:27:40.785Z
 * This script creates an exact replica of your production DynamoDB tables locally.
 */

const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');

// DynamoDB configuration for local development
const dynamoConfig = {
  endpoint: 'http://localhost:8002',
  region: 'us-east-2',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
};

const dynamoClient = new DynamoDB(dynamoConfig);
const docClient = DynamoDBDocument.from(dynamoClient);

// Production table schemas (extracted from AWS)
const TABLE_SCHEMAS = {
  "dev-ai-nexus-activity-feed": {
    "TableName": "dev-ai-nexus-activity-feed",
    "KeySchema": [
      {
        "AttributeName": "entity_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "timestamp",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "activity_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "entity_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "timestamp",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-type-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "activity_type",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-timestamp-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "organization-timestamp-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-agent-execution-history": {
    "TableName": "dev-ai-nexus-agent-execution-history",
    "KeySchema": [
      {
        "AttributeName": "agent_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "run_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "agent_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "completed_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "run_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "started_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "status",
        "AttributeType": "S"
      },
      {
        "AttributeName": "tenant_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "status-runs-index",
        "KeySchema": [
          {
            "AttributeName": "status",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "started_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "tenant-runs-index",
        "KeySchema": [
          {
            "AttributeName": "tenant_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "started_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-runs-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "started_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "completed-runs-index",
        "KeySchema": [
          {
            "AttributeName": "tenant_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "completed_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-agent-flows": {
    "TableName": "dev-ai-nexus-agent-flows",
    "KeySchema": [
      {
        "AttributeName": "agent_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "version",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "agent_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "version",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "updated-at-index",
        "KeySchema": [
          {
            "AttributeName": "agent_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-agent-templates": {
    "TableName": "dev-ai-nexus-agent-templates",
    "KeySchema": [
      {
        "AttributeName": "template_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "category",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "is_public",
        "AttributeType": "S"
      },
      {
        "AttributeName": "rating",
        "AttributeType": "N"
      },
      {
        "AttributeName": "template_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "tenant_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "usage_count",
        "AttributeType": "N"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "popular-templates-index",
        "KeySchema": [
          {
            "AttributeName": "category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "usage_count",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "tenant-templates-index",
        "KeySchema": [
          {
            "AttributeName": "tenant_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "category-rating-index",
        "KeySchema": [
          {
            "AttributeName": "category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "rating",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "public-usage-index",
        "KeySchema": [
          {
            "AttributeName": "is_public",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "usage_count",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-agent-versions": {
    "TableName": "dev-ai-nexus-agent-versions",
    "KeySchema": [
      {
        "AttributeName": "agent_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "version",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "agent_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_by",
        "AttributeType": "S"
      },
      {
        "AttributeName": "version",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "created-at-index",
        "KeySchema": [
          {
            "AttributeName": "agent_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "creator-index",
        "KeySchema": [
          {
            "AttributeName": "created_by",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-agents": {
    "TableName": "dev-ai-nexus-agents",
    "KeySchema": [
      {
        "AttributeName": "agent_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "agent_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "agent_status",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "owner_user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-updated-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "organization-status-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "agent_status",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "owner-updated-index",
        "KeySchema": [
          {
            "AttributeName": "owner_user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-aggregated-analytics": {
    "TableName": "dev-ai-nexus-aggregated-analytics",
    "KeySchema": [
      {
        "AttributeName": "metric_name",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "date_dimension",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "date_dimension",
        "AttributeType": "S"
      },
      {
        "AttributeName": "metric_name",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-date-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "date_dimension",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-application-settings": {
    "TableName": "dev-ai-nexus-application-settings",
    "KeySchema": [
      {
        "AttributeName": "setting_category",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "setting_key",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "setting_category",
        "AttributeType": "S"
      },
      {
        "AttributeName": "setting_key",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "updated-at-index",
        "KeySchema": [
          {
            "AttributeName": "setting_category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-cognito-group-mappings": {
    "TableName": "dev-ai-nexus-cognito-group-mappings",
    "KeySchema": [
      {
        "AttributeName": "cognito_group",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "cognito_group",
        "AttributeType": "S"
      },
      {
        "AttributeName": "role",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "role-updated-index",
        "KeySchema": [
          {
            "AttributeName": "role",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-community-comments": {
    "TableName": "dev-ai-nexus-community-comments",
    "KeySchema": [
      {
        "AttributeName": "post_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "comment_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "author_user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "comment_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "post_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "author-created-index",
        "KeySchema": [
          {
            "AttributeName": "author_user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-community-posts": {
    "TableName": "dev-ai-nexus-community-posts",
    "KeySchema": [
      {
        "AttributeName": "post_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "author_user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "post_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "topic",
        "AttributeType": "S"
      },
      {
        "AttributeName": "trending_score",
        "AttributeType": "N"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-created-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "organization-trending-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "trending_score",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "author-created-index",
        "KeySchema": [
          {
            "AttributeName": "author_user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "topic-created-index",
        "KeySchema": [
          {
            "AttributeName": "topic",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-courses": {
    "TableName": "dev-ai-nexus-courses",
    "KeySchema": [
      {
        "AttributeName": "course_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "category",
        "AttributeType": "S"
      },
      {
        "AttributeName": "course_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "difficulty_level",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "visibility",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "category-updated-index",
        "KeySchema": [
          {
            "AttributeName": "category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "visibility-updated-index",
        "KeySchema": [
          {
            "AttributeName": "visibility",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "category-difficulty-index",
        "KeySchema": [
          {
            "AttributeName": "category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "difficulty_level",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-dashboard-metrics": {
    "TableName": "dev-ai-nexus-dashboard-metrics",
    "KeySchema": [
      {
        "AttributeName": "metric_type",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "timestamp",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "date",
        "AttributeType": "S"
      },
      {
        "AttributeName": "metric_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "timestamp",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "user-metrics-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "daily-metrics-index",
        "KeySchema": [
          {
            "AttributeName": "metric_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "date",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-datasets": {
    "TableName": "dev-ai-nexus-datasets",
    "KeySchema": [
      {
        "AttributeName": "dataset_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "dataset_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "dataset_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "owner_user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-updated-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "organization-type-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "dataset_type",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "owner-updated-index",
        "KeySchema": [
          {
            "AttributeName": "owner_user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-education-courses": {
    "TableName": "dev-ai-nexus-education-courses",
    "KeySchema": [
      {
        "AttributeName": "course_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "category",
        "AttributeType": "S"
      },
      {
        "AttributeName": "course_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "difficulty_level",
        "AttributeType": "S"
      },
      {
        "AttributeName": "title",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "category-courses-index",
        "KeySchema": [
          {
            "AttributeName": "category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "title",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "difficulty-courses-index",
        "KeySchema": [
          {
            "AttributeName": "difficulty_level",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-enrollments": {
    "TableName": "dev-ai-nexus-enrollments",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "course_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "course_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "enrolled_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "enrollment_status",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "course-enrolled-index",
        "KeySchema": [
          {
            "AttributeName": "course_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "enrolled_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-status-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "enrollment_status",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-experiment-run-logs": {
    "TableName": "dev-ai-nexus-experiment-run-logs",
    "KeySchema": [
      {
        "AttributeName": "experiment_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "log_timestamp",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "component_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "experiment_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "log_level",
        "AttributeType": "S"
      },
      {
        "AttributeName": "log_timestamp",
        "AttributeType": "S"
      },
      {
        "AttributeName": "run_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "tenant_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "level-logs-index",
        "KeySchema": [
          {
            "AttributeName": "log_level",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "log_timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "run-logs-index",
        "KeySchema": [
          {
            "AttributeName": "run_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "log_timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "component-logs-index",
        "KeySchema": [
          {
            "AttributeName": "component_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "log_timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "tenant-logs-index",
        "KeySchema": [
          {
            "AttributeName": "tenant_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "log_timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-experiment-runs": {
    "TableName": "dev-ai-nexus-experiment-runs",
    "KeySchema": [
      {
        "AttributeName": "experiment_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "run_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "experiment_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "run_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "run_status",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "created-at-index",
        "KeySchema": [
          {
            "AttributeName": "experiment_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "experiment-status-index",
        "KeySchema": [
          {
            "AttributeName": "experiment_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "run_status",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-experiments": {
    "TableName": "dev-ai-nexus-experiments",
    "KeySchema": [
      {
        "AttributeName": "experiment_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "experiment_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "experiment_status",
        "AttributeType": "S"
      },
      {
        "AttributeName": "project_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "project-created-index",
        "KeySchema": [
          {
            "AttributeName": "project_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-created-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-status-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "experiment_status",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-flow-node-configs": {
    "TableName": "dev-ai-nexus-flow-node-configs",
    "KeySchema": [
      {
        "AttributeName": "flow_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "node_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "flow_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "node_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "node_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "tenant_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "node-type-index",
        "KeySchema": [
          {
            "AttributeName": "node_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "tenant-flows-index",
        "KeySchema": [
          {
            "AttributeName": "tenant_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "flow_id",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-flow-templates": {
    "TableName": "dev-ai-nexus-flow-templates",
    "KeySchema": [
      {
        "AttributeName": "template_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "category",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_by",
        "AttributeType": "S"
      },
      {
        "AttributeName": "template_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "visibility",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "category-updated-index",
        "KeySchema": [
          {
            "AttributeName": "category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "creator-updated-index",
        "KeySchema": [
          {
            "AttributeName": "created_by",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "visibility-updated-index",
        "KeySchema": [
          {
            "AttributeName": "visibility",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-group-memberships": {
    "TableName": "dev-ai-nexus-group-memberships",
    "KeySchema": [
      {
        "AttributeName": "group_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "user_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "group_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "group_role",
        "AttributeType": "S"
      },
      {
        "AttributeName": "joined_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "group-joined-index",
        "KeySchema": [
          {
            "AttributeName": "group_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "joined_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-role-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "group_role",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-groups": {
    "TableName": "dev-ai-nexus-groups",
    "KeySchema": [
      {
        "AttributeName": "group_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "group_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "topic",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "visibility",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-updated-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "topic-updated-index",
        "KeySchema": [
          {
            "AttributeName": "topic",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "visibility-updated-index",
        "KeySchema": [
          {
            "AttributeName": "visibility",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-lab-experiments": {
    "TableName": "dev-ai-nexus-lab-experiments",
    "KeySchema": [
      {
        "AttributeName": "experiment_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "version",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "experiment_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "status",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "version",
        "AttributeType": "S"
      },
      {
        "AttributeName": "workspace_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "status-experiments-index",
        "KeySchema": [
          {
            "AttributeName": "status",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "workspace-experiments-index",
        "KeySchema": [
          {
            "AttributeName": "workspace_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-experiments-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-lab-model-registry": {
    "TableName": "dev-ai-nexus-lab-model-registry",
    "KeySchema": [
      {
        "AttributeName": "tenant_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "model_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "deployment_status",
        "AttributeType": "S"
      },
      {
        "AttributeName": "model_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "model_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "project_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "status",
        "AttributeType": "S"
      },
      {
        "AttributeName": "tenant_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "project-models-index",
        "KeySchema": [
          {
            "AttributeName": "project_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "deployment-status-index",
        "KeySchema": [
          {
            "AttributeName": "deployment_status",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "type-status-index",
        "KeySchema": [
          {
            "AttributeName": "model_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "status",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "tenant-updated-index",
        "KeySchema": [
          {
            "AttributeName": "tenant_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-lesson-progress": {
    "TableName": "dev-ai-nexus-lesson-progress",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "course_lesson_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "course_lesson_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "user-updated-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-lessons": {
    "TableName": "dev-ai-nexus-lessons",
    "KeySchema": [
      {
        "AttributeName": "course_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "lesson_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "course_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "lesson_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "order_idx",
        "AttributeType": "N"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "course-order-index",
        "KeySchema": [
          {
            "AttributeName": "course_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "order_idx",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-metrics-timeseries": {
    "TableName": "dev-ai-nexus-metrics-timeseries",
    "KeySchema": [
      {
        "AttributeName": "run_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "timestamp",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "metric_name",
        "AttributeType": "S"
      },
      {
        "AttributeName": "run_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "timestamp",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "metric-time-index",
        "KeySchema": [
          {
            "AttributeName": "metric_name",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-models": {
    "TableName": "dev-ai-nexus-models",
    "KeySchema": [
      {
        "AttributeName": "model_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "model_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "model_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "owner_user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-updated-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "organization-type-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "model_type",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "owner-updated-index",
        "KeySchema": [
          {
            "AttributeName": "owner_user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-notification-subscriptions": {
    "TableName": "dev-ai-nexus-notification-subscriptions",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "channel",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "channel",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    }
  },
  "dev-ai-nexus-notifications": {
    "TableName": "dev-ai-nexus-notifications",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "notification_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "is_read",
        "AttributeType": "S"
      },
      {
        "AttributeName": "notification_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "notification_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "user-unread-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "is_read",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-type-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "notification_type",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-created-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-organization-data": {
    "TableName": "dev-ai-nexus-organization-data",
    "KeySchema": [
      {
        "AttributeName": "organization_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "data_type",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "data_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "created-at-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "data-type-index",
        "KeySchema": [
          {
            "AttributeName": "data_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-organization-memberships": {
    "TableName": "dev-ai-nexus-organization-memberships",
    "KeySchema": [
      {
        "AttributeName": "organization_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "user_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "joined_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "org_role",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-role-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "org_role",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "organization-joined-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "joined_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-role-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "org_role",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-organization-settings": {
    "TableName": "dev-ai-nexus-organization-settings",
    "KeySchema": [
      {
        "AttributeName": "organization_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "setting_type",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "setting_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "org-updated-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "setting-updated-index",
        "KeySchema": [
          {
            "AttributeName": "setting_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-project-memberships": {
    "TableName": "dev-ai-nexus-project-memberships",
    "KeySchema": [
      {
        "AttributeName": "project_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "user_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "joined_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "project_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "project_role",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "project-role-index",
        "KeySchema": [
          {
            "AttributeName": "project_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "project_role",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-role-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "joined_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-projects": {
    "TableName": "dev-ai-nexus-projects",
    "KeySchema": [
      {
        "AttributeName": "project_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "owner_user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "project_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-updated-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "organization-created-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "owner-updated-index",
        "KeySchema": [
          {
            "AttributeName": "owner_user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-prompts-library": {
    "TableName": "dev-ai-nexus-prompts-library",
    "KeySchema": [
      {
        "AttributeName": "prompt_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "owner_user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "prompt_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "tag",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-updated-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "owner-updated-index",
        "KeySchema": [
          {
            "AttributeName": "owner_user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "tag-updated-index",
        "KeySchema": [
          {
            "AttributeName": "tag",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-quiz-results": {
    "TableName": "dev-ai-nexus-quiz-results",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "quiz_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "quiz_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "submitted_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "user-submitted-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "submitted_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "quiz-submitted-index",
        "KeySchema": [
          {
            "AttributeName": "quiz_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "submitted_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-quizzes": {
    "TableName": "dev-ai-nexus-quizzes",
    "KeySchema": [
      {
        "AttributeName": "quiz_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "course_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "lesson_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "quiz_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "course-lesson-index",
        "KeySchema": [
          {
            "AttributeName": "course_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "lesson_id",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-reactions": {
    "TableName": "dev-ai-nexus-reactions",
    "KeySchema": [
      {
        "AttributeName": "entity_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "user_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "entity_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "reaction_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "user-entity-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "entity_id",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "entity-type-index",
        "KeySchema": [
          {
            "AttributeName": "entity_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "reaction_type",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-role-permissions": {
    "TableName": "dev-ai-nexus-role-permissions",
    "KeySchema": [
      {
        "AttributeName": "role_name",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "permission_key",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "permission_key",
        "AttributeType": "S"
      },
      {
        "AttributeName": "resource_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "role_name",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "role-resource-index",
        "KeySchema": [
          {
            "AttributeName": "role_name",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "resource_type",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-roles": {
    "TableName": "dev-ai-nexus-roles",
    "KeySchema": [
      {
        "AttributeName": "role_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "role_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "role_type",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-created-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "type-created-index",
        "KeySchema": [
          {
            "AttributeName": "role_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-subscription-billing": {
    "TableName": "dev-ai-nexus-subscription-billing",
    "KeySchema": [
      {
        "AttributeName": "organization_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "billing_period",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "billing_period",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "subscription_tier",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "org-created-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "tier-period-index",
        "KeySchema": [
          {
            "AttributeName": "subscription_tier",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "billing_period",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-subscription-limits": {
    "TableName": "dev-ai-nexus-subscription-limits",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "limit_type",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "limit_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "period_start",
        "AttributeType": "S"
      },
      {
        "AttributeName": "subscription_tier",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "tier-period-index",
        "KeySchema": [
          {
            "AttributeName": "subscription_tier",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "period_start",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-period-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "period_start",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-system-logs": {
    "TableName": "dev-ai-nexus-system-logs",
    "KeySchema": [
      {
        "AttributeName": "log_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "timestamp",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "date",
        "AttributeType": "S"
      },
      {
        "AttributeName": "event_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "log_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "timestamp",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "daily-logs-index",
        "KeySchema": [
          {
            "AttributeName": "date",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "KEYS_ONLY"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-logs-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "event-type-index",
        "KeySchema": [
          {
            "AttributeName": "event_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "timestamp",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-team-memberships": {
    "TableName": "dev-ai-nexus-team-memberships",
    "KeySchema": [
      {
        "AttributeName": "organization_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "user_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "joined_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "role",
        "AttributeType": "S"
      },
      {
        "AttributeName": "status",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "user-joined-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "joined_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "org-status-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "status",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "org-role-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "role",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-toolset-items": {
    "TableName": "dev-ai-nexus-toolset-items",
    "KeySchema": [
      {
        "AttributeName": "tool_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "category",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "name",
        "AttributeType": "S"
      },
      {
        "AttributeName": "tool_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "created-at-index",
        "KeySchema": [
          {
            "AttributeName": "category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "category-tools-index",
        "KeySchema": [
          {
            "AttributeName": "category",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "name",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-user-content-metadata": {
    "TableName": "dev-ai-nexus-user-content-metadata",
    "KeySchema": [
      {
        "AttributeName": "content_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "content_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "content_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-content-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "content-type-index",
        "KeySchema": [
          {
            "AttributeName": "content_type",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-content-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-user-permissions": {
    "TableName": "dev-ai-nexus-user-permissions",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "permission",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "granted_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "granted_by",
        "AttributeType": "S"
      },
      {
        "AttributeName": "permission",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "permission-granted-index",
        "KeySchema": [
          {
            "AttributeName": "permission",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "granted_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "granted-by-index",
        "KeySchema": [
          {
            "AttributeName": "granted_by",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "granted_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-user-profiles": {
    "TableName": "dev-ai-nexus-user-profiles",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "email",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "email-index",
        "KeySchema": [
          {
            "AttributeName": "email",
            "KeyType": "HASH"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-user-progress": {
    "TableName": "dev-ai-nexus-user-progress",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "course_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "course_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "course-progress-index",
        "KeySchema": [
          {
            "AttributeName": "course_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-user-quotas": {
    "TableName": "dev-ai-nexus-user-quotas",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "quota_type",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "quota_type",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-quota-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "quota_type",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "user-updated-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-user-sessions": {
    "TableName": "dev-ai-nexus-user-sessions",
    "KeySchema": [
      {
        "AttributeName": "session_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "session_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "user-sessions-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-users": {
    "TableName": "dev-ai-nexus-users",
    "KeySchema": [
      {
        "AttributeName": "user_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "created_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "email",
        "AttributeType": "S"
      },
      {
        "AttributeName": "last_login_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "role",
        "AttributeType": "S"
      },
      {
        "AttributeName": "subscription_tier",
        "AttributeType": "S"
      },
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-role-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "role",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "organization-login-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "last_login_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "subscription-created-index",
        "KeySchema": [
          {
            "AttributeName": "subscription_tier",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "created_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "email-index",
        "KeySchema": [
          {
            "AttributeName": "email",
            "KeyType": "HASH"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-workspace-memberships": {
    "TableName": "dev-ai-nexus-workspace-memberships",
    "KeySchema": [
      {
        "AttributeName": "workspace_id",
        "KeyType": "HASH"
      },
      {
        "AttributeName": "user_id",
        "KeyType": "RANGE"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "workspace_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "workspace_role",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "user-role-index",
        "KeySchema": [
          {
            "AttributeName": "user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "workspace_role",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  },
  "dev-ai-nexus-workspaces": {
    "TableName": "dev-ai-nexus-workspaces",
    "KeySchema": [
      {
        "AttributeName": "workspace_id",
        "KeyType": "HASH"
      }
    ],
    "AttributeDefinitions": [
      {
        "AttributeName": "organization_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "owner_user_id",
        "AttributeType": "S"
      },
      {
        "AttributeName": "updated_at",
        "AttributeType": "S"
      },
      {
        "AttributeName": "workspace_id",
        "AttributeType": "S"
      }
    ],
    "BillingMode": "PROVISIONED",
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    },
    "GlobalSecondaryIndexes": [
      {
        "IndexName": "organization-updated-index",
        "KeySchema": [
          {
            "AttributeName": "organization_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      },
      {
        "IndexName": "owner-updated-index",
        "KeySchema": [
          {
            "AttributeName": "owner_user_id",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "updated_at",
            "KeyType": "RANGE"
          }
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        }
      }
    ]
  }
};

// Helper functions
async function tableExists(tableName) {
  try {
    await dynamoClient.describeTable({ TableName: tableName });
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function createTable(schema) {
  const tableName = schema.TableName;
  console.log(`🔨 Creating table: ${tableName}`);
  
  try {
    // Remove undefined fields
    const cleanSchema = JSON.parse(JSON.stringify(schema));
    
    await dynamoClient.createTable(cleanSchema);
    
    // Wait for table to be active
    let status = 'CREATING';
    while (status !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await dynamoClient.describeTable({ TableName: tableName });
      status = result.Table.TableStatus;
      console.log(`   ⏳ Table status: ${status}`);
    }
    
    console.log(`   ✅ Table created successfully: ${tableName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error creating table ${tableName}:`, error.message);
    return false;
  }
}

async function testConnection() {
  console.log('🔌 Testing DynamoDB connection...');
  
  try {
    await dynamoClient.listTables({});
    console.log('   ✅ Connection successful!');
    return true;
  } catch (error) {
    console.error('   ❌ Connection failed:', error.message);
    console.error('   💡 Make sure DynamoDB Local is running on http://localhost:8002');
    return false;
  }
}

async function main() {
  console.log('🚀 Production DynamoDB Local Setup');
  console.log('==================================\n');
  
  // Test connection
  if (!(await testConnection())) {
    process.exit(1);
  }
  
  console.log('\n📋 Setting up production tables...\n');
  
  let tablesCreated = 0;
  let tablesSkipped = 0;
  
  for (const [tableName, schema] of Object.entries(TABLE_SCHEMAS)) {
    if (await tableExists(tableName)) {
      console.log(`⏭️  Table already exists: ${tableName}`);
      tablesSkipped++;
    } else {
      if (await createTable(schema)) {
        tablesCreated++;
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Tables created: ${tablesCreated}`);
  console.log(`   ⏭️  Tables skipped: ${tablesSkipped}`);
  console.log(`   📋 Total tables: ${Object.keys(TABLE_SCHEMAS).length}`);
  
  console.log(`\n🎉 Production DynamoDB setup complete!`);
  console.log(`\n🔍 Access DynamoDB Admin UI at: http://localhost:8001`);
  console.log(`📊 DynamoDB Local running at: http://localhost:8002`);
  console.log(`\nYou can now run: npm run dev\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, testConnection, createTable };