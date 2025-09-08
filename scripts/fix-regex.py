#!/usr/bin/env python3

import re
import os

# Fix router.ts regex patterns
router_path = os.path.join(os.path.dirname(__file__), '..', 'lambda', 'api', 'router.ts')

print("🔧 Fixing regex patterns in router.ts...")

with open(router_path, 'r') as f:
    content = f.read()

# Fix all [^\\/]+ patterns to [^/]+
content = content.replace('[^\\/]+', '[^/]+')
content = content.replace('[^\\/]', '[^/]')

with open(router_path, 'w') as f:
    f.write(content)

print("✅ Fixed router.ts regex patterns")

# Fix tenant.ts as well
tenant_path = os.path.join(os.path.dirname(__file__), '..', 'lambda', 'api', 'middleware', 'tenant.ts')
if os.path.exists(tenant_path):
    with open(tenant_path, 'r') as f:
        tenant_content = f.read()
    
    tenant_content = tenant_content.replace('\\/', '/')
    
    with open(tenant_path, 'w') as f:
        f.write(tenant_content)
    
    print("✅ Fixed tenant.ts regex patterns")

print("🎉 All regex fixes completed!")
