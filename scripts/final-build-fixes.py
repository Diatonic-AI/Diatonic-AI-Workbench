#!/usr/bin/env python3

import os
import re

def main():
    print("🔧 Applying final build fixes...\n")
    
    project_root = os.path.join(os.path.dirname(__file__), '..')
    
    # Fix const reassignment issues
    files_to_fix_const = [
        'src/lib/api/agent-templates.ts',
        'src/lib/api/lab.ts'
    ]
    
    for file_path in files_to_fix_const:
        full_path = os.path.join(project_root, file_path)
        if os.path.exists(full_path):
            with open(full_path, 'r') as f:
                content = f.read()
            
            original_content = content
            
            # Fix filterExpression declarations
            content = re.sub(r'const\s+filterExpression\s*=\s*[\'"][^\'"]*[\'"];', 'let filterExpression = \'\';', content)
            
            # Fix totalDuration and completedRuns
            content = re.sub(r'const\s+totalDuration\s*=\s*0;', 'let totalDuration = 0;', content)
            content = re.sub(r'const\s+completedRuns\s*=\s*0;', 'let completedRuns = 0;', content)
            
            if content != original_content:
                with open(full_path, 'w') as f:
                    f.write(content)
                print(f"✅ Fixed const reassignments in: {file_path}")
    
    # Fix syntax error in flow-nodes.ts
    flow_nodes_path = os.path.join(project_root, 'src/lib/api/flow-nodes.ts')
    if os.path.exists(flow_nodes_path):
        with open(flow_nodes_path, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        fixed_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Look for the problematic pattern around line 469
            if '} else {' in line and i > 0:
                prev_line = lines[i-1].strip()
                # Check if previous line doesn't end with proper statement
                if prev_line and not prev_line.endswith((';', '}', '{')):
                    # This is likely the malformed if-else block
                    # Try to fix it by adding proper if condition
                    if 'const nodes' in prev_line or 'nodes =' in prev_line:
                        # Look back to find the if condition
                        j = i - 1
                        while j >= 0 and 'if (' not in lines[j]:
                            j -= 1
                        
                        if j >= 0:  # Found if condition
                            # Reconstruct the if-else block properly
                            if_condition = lines[j].strip()
                            
                            # Replace the problematic section
                            fixed_section = [
                                if_condition,
                                '        const nodes = await this.getTemplateNodes(templateId);',
                                '      } else {',
                                '        const nodes = await this.getTenantFlowNodes(undefined, 1000);',
                                '      }'
                            ]
                            
                            # Skip the problematic lines and use our fixed section
                            fixed_lines.extend(fixed_section)
                            i += 2  # Skip current and next line
                            continue
            
            fixed_lines.append(line)
            i += 1
        
        fixed_content = '\n'.join(fixed_lines)
        
        if fixed_content != content:
            with open(flow_nodes_path, 'w') as f:
                f.write(fixed_content)
            print("✅ Fixed syntax error in: src/lib/api/flow-nodes.ts")
    
    print("\n🎉 Final build fixes completed!")
    print("Run 'npm run build' to test the fixes.")

if __name__ == "__main__":
    main()
