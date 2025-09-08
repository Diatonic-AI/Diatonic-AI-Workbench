#!/usr/bin/env python3

import os
import re

def fix_file(file_path, patterns):
    """Apply patterns to fix a file"""
    if not os.path.exists(file_path):
        return False
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"✅ Fixed: {os.path.relpath(file_path)}")
        return True
    
    return False

def main():
    print("🔧 Applying final TypeScript fixes...\n")
    
    project_root = os.path.join(os.path.dirname(__file__), '..')
    
    # Common patterns for fixing 'any' types
    common_patterns = [
        (r'\bany\b(?=\s*[,;)\]\}])', 'unknown'),  # any at end of type
        (r':\s*any\s*=', ': unknown ='),  # variable declarations
        (r'<any>', '<unknown>'),  # generic parameters
        (r'Array<any>', 'Array<unknown>'),  # array types
        (r'any\[\]', 'unknown[]'),  # array shorthand
    ]
    
    # Specific file fixes
    fixes = [
        # Fix lambda handlers
        {
            'file': os.path.join(project_root, 'lambda/api/handlers/agents.ts'),
            'patterns': [
                (r'body:\s*any', 'body: RequestBody'),
                (r'params:\s*any', 'params: Record<string, string>'),
                (r'query:\s*any', 'query: Record<string, unknown>'),
                (r'event:\s*any', 'event: APIGatewayEvent'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'lambda/api/handlers/analytics.ts'),
            'patterns': [
                (r'event:\s*any', 'event: APIGatewayEvent'),
                (r'metrics:\s*any', 'metrics: Record<string, unknown>'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'lambda/api/handlers/billing.ts'),
            'patterns': [
                (r'stripeEvent:\s*any', 'stripeEvent: { type: string; data: Record<string, unknown> }'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'lambda/api/handlers/webhooks.ts'),
            'patterns': [
                (r'payload:\s*any', 'payload: Record<string, unknown>'),
                (r'webhook:\s*any', 'webhook: WebhookEvent'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'lambda/api/middleware/auth.ts'),
            'patterns': [
                (r'event:\s*any', 'event: APIGatewayEvent'),
                (r'context:\s*any', 'context: APIGatewayContext'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'lambda/api/utils/api.ts'),
            'patterns': [
                (r'data:\s*any', 'data: unknown'),
                (r'error:\s*any', 'error: Error | unknown'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'lambda/api/utils/database.ts'),
            'patterns': [
                (r'item:\s*any', 'item: Record<string, unknown>'),
                (r'result:\s*any', 'result: QueryResult'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'src/components/auth/AuthComponents.tsx'),
            'patterns': [
                (r'props:\s*any', 'props: Record<string, unknown>'),
                (r'React\.FC<any>', 'React.FC<Record<string, unknown>>'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'src/hooks/useApiServices.ts'),
            'patterns': [
                (r'response:\s*any', 'response: unknown'),
                (r'error:\s*any', 'error: Error | unknown'),
                *common_patterns
            ]
        },
        {
            'file': os.path.join(project_root, 'lambda/tests/e2e/experiment-workflow.test.ts'),
            'patterns': [
                (r'let\s+(experimentId|datasetId)\s*=', r'const \1 ='),  # prefer-const
                *common_patterns
            ]
        }
    ]
    
    # Apply fixes
    fixed_count = 0
    for fix in fixes:
        if fix_file(fix['file'], fix['patterns']):
            fixed_count += 1
    
    # Fix empty object types
    agent_types_path = os.path.join(project_root, 'src/components/agent-builder/types.ts')
    if os.path.exists(agent_types_path):
        with open(agent_types_path, 'r') as f:
            content = f.read()
        
        # Replace empty interfaces with proper types
        content = re.sub(r'interface\s+(\w+)\s+extends\s+([^{]+)\s*{\s*}', r'type \1 = \2', content)
        content = re.sub(r'interface\s+(\w+)\s*{\s*}', r'interface \1 {\n  [key: string]: unknown;\n}', content)
        
        with open(agent_types_path, 'w') as f:
            f.write(content)
        print(f"✅ Fixed: {os.path.relpath(agent_types_path)}")
        fixed_count += 1
    
    # Fix case declarations in observatory handler
    observatory_path = os.path.join(project_root, 'lambda/observatory-api/handler.ts')
    if os.path.exists(observatory_path):
        with open(observatory_path, 'r') as f:
            content = f.read()
        
        # Wrap case declarations in blocks
        lines = content.split('\n')
        in_switch = False
        fixed_lines = []
        
        for i, line in enumerate(lines):
            if 'switch' in line and '{' in line:
                in_switch = True
            elif in_switch and '}' in line and 'case' not in line:
                in_switch = False
            elif in_switch and line.strip().startswith('case') and ':' in line:
                # Check if next line has a declaration
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if next_line.startswith(('const ', 'let ', 'var ')):
                        fixed_lines.append(line)
                        fixed_lines.append(lines[i + 1].replace(next_line, '        {'))
                        fixed_lines.append('        ' + next_line)
                        continue
            
            fixed_lines.append(line)
        
        with open(observatory_path, 'w') as f:
            f.write('\n'.join(fixed_lines))
        print(f"✅ Fixed: {os.path.relpath(observatory_path)}")
        fixed_count += 1
    
    # Summary
    print(f"\n🎉 TypeScript fixes completed!")
    print(f"📊 Files fixed: {fixed_count}")
    print("Run 'npm run lint' to check remaining issues.")

if __name__ == "__main__":
    main()
