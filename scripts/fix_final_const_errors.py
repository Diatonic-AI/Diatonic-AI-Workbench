#!/usr/bin/env python3
"""
Fix the final const variable declaration errors in the codebase
"""
import os
import re

def fix_const_errors():
    fixes = [
        {
            'file': 'src/lib/api/lab.ts',
            'search': r'    // Default to scan with filters\s*\n\s*const filterExpression = \{\};',
            'replace': '    // Default to scan with filters\n    let filterExpression: string | object = {};'
        },
        {
            'file': 'src/lib/api/flow-nodes.ts', 
            'search': r'    // Default to scan with filters\s*\n\s*const filterExpression = \{\};',
            'replace': '    // Default to scan with filters\n    let filterExpression: string | object = {};'
        },
        {
            'file': 'src/lib/api/dynamodb-client.ts',
            'search': r'const dynamodbClient = null;',
            'replace': 'let dynamodbClient: DynamoDBDocumentClient | null = null;'
        },
        {
            'file': 'src/lib/api/lab.ts',
            'search': r'const expressionAttributeValues: Record<string, any> = \{\};',
            'replace': 'const expressionAttributeValues: Record<string, any> = {};'
        },
        {
            'file': 'src/lib/api/flow-nodes.ts',
            'search': r'const expressionAttributeValues: Record<string, any> = \{\};',
            'replace': 'const expressionAttributeValues: Record<string, any> = {};'
        }
    ]
    
    for fix in fixes:
        file_path = fix['file']
        if os.path.exists(file_path):
            print(f"Fixing {file_path}...")
            
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Apply the fix
            new_content = re.sub(fix['search'], fix['replace'], content, flags=re.MULTILINE)
            
            if new_content != content:
                with open(file_path, 'w') as f:
                    f.write(new_content)
                print(f"  ✅ Applied fix to {file_path}")
            else:
                print(f"  ⚠️  No match found for {file_path} - checking manually...")
                
                # Try more specific patterns for each file
                if 'lab.ts' in file_path:
                    # Add missing expressionAttributeValues declaration if not exists
                    if 'expressionAttributeValues[' in content and 'const expressionAttributeValues:' not in content:
                        search_pos = content.find('// Default to scan with filters')
                        if search_pos != -1:
                            lines = content[:search_pos].split('\n')
                            insert_pos = len('\n'.join(lines))
                            new_content = (content[:insert_pos] + 
                                         '\n    const expressionAttributeValues: Record<string, any> = {};\n' + 
                                         content[insert_pos:])
                            
                            with open(file_path, 'w') as f:
                                f.write(new_content)
                            print(f"  ✅ Added expressionAttributeValues declaration to {file_path}")
                
                if 'flow-nodes.ts' in file_path:
                    # Add missing expressionAttributeValues declaration if not exists
                    if 'expressionAttributeValues[' in content and 'const expressionAttributeValues:' not in content:
                        search_pos = content.find('// Default to scan with filters')
                        if search_pos != -1:
                            lines = content[:search_pos].split('\n')
                            insert_pos = len('\n'.join(lines))
                            new_content = (content[:insert_pos] + 
                                         '\n    const expressionAttributeValues: Record<string, any> = {};\n' + 
                                         content[insert_pos:])
                            
                            with open(file_path, 'w') as f:
                                f.write(new_content)
                            print(f"  ✅ Added expressionAttributeValues declaration to {file_path}")
        else:
            print(f"❌ File not found: {file_path}")

if __name__ == "__main__":
    print("🔧 Fixing final const variable declaration errors...")
    fix_const_errors()
    print("✅ Const error fixes completed!")
