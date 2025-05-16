import os
import re

def fix_imports(directory):
    fixed_files = 0
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                
                # Read the file
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace import patterns
                new_content = re.sub(r'from\s+backend\.app', 'from app', content)
                new_content = re.sub(r'import\s+backend\.app', 'import app', new_content)
                
                # Write back only if changes were made
                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    fixed_files += 1
                    print(f"Fixed imports in: {filepath}")
    
    print(f"\nFixed imports in {fixed_files} files.")

if __name__ == "__main__":
    # Fix imports in the backend directory and its subdirectories
    fix_imports(os.path.dirname(os.path.abspath(__file__)))
    print("Done! Try running your application again.")
