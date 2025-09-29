#!/usr/bin/env python3

import os
import re
import subprocess

def find_production_files():
    """Find all production files that may contain transform violations"""
    cmd = [
        "find", "/Users/josuehernandez/pwa_angular/src",
        "(", "-name", "*.scss", "-o", "-name", "*.css", "-o", "-name", "*.ts", "-o", "-name", "*.html", ")",
        "!", "-path", "*/node_modules/*",
        "!", "-name", "*.spec.ts",
        "!", "-name", "*.test.ts",
        "!", "-name", "*.backup*",
        "!", "-name", "*.broken",
        "!", "-name", "*.working"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout.strip().split('\n') if result.stdout.strip() else []

def fix_transform_violations(file_path):
    """Fix transform violations in a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Skip files that only have text-transform or transform-origin
        if 'transform:' not in content:
            return False

        # Count violations before
        violations_before = len(re.findall(r'transform:\s*(?!none\s*;?\s*/\*\s*OpenAI)', content))
        violations_before -= len(re.findall(r'text-transform:|transform-origin:', content))

        if violations_before == 0:
            return False

        # Fix violations line by line
        lines = content.split('\n')
        modified = False

        for i, line in enumerate(lines):
            if 'transform:' in line and 'OpenAI no transforms' not in line:
                # Skip text-transform and transform-origin
                if 'text-transform:' in line or 'transform-origin:' in line:
                    continue

                # Extract indentation
                indent = ''
                for char in line:
                    if char in ' \t':
                        indent += char
                    else:
                        break

                # Check if it's in a keyframe
                if re.search(r'^\s*\d+%\s*\{', line):
                    # Keyframe format: 0% { transform: ... }
                    lines[i] = re.sub(r'transform:\s*[^}]*}', 'transform: none; /* OpenAI no transforms */ }', line)
                elif re.search(r'^\s*\d+%\s*{', line):
                    # Keyframe format: 0% { transform: ... }
                    lines[i] = re.sub(r'transform:\s*[^}]*}', 'transform: none; /* OpenAI no transforms */ }', line)
                elif '{' in line and '}' in line and 'transform:' in line:
                    # One-line rule: .class { transform: value; }
                    lines[i] = re.sub(r'transform:\s*[^;}]*;?', 'transform: none; /* OpenAI no transforms */', line)
                else:
                    # Multi-line rule: replace the transform value
                    lines[i] = re.sub(r'transform:\s*[^;]*;', 'transform: none; /* OpenAI no transforms */', line)
                    if 'transform:' in line and ';' not in line:
                        # Handle case where semicolon is missing
                        lines[i] = re.sub(r'transform:\s*[^;]*$', 'transform: none; /* OpenAI no transforms */', line)

                modified = True

        if modified:
            new_content = '\n'.join(lines)

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)

            print(f"Fixed: {file_path}")
            return True

        return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    print("🚀 Starting final OpenAI Transform Compliance fix...")

    # Find all production files
    production_files = find_production_files()
    print(f"Found {len(production_files)} production files to check")

    # Process each file
    fixed_files = 0
    for file_path in production_files:
        if file_path and os.path.exists(file_path):
            if fix_transform_violations(file_path):
                fixed_files += 1

    print(f"\n✅ Processed {fixed_files} files with violations")

    # Final verification
    print("\n🔍 Running final verification...")
    cmd = [
        "rg", "transform:", "/Users/josuehernandez/pwa_angular/src",
        "--type", "html", "--type", "css", "--type", "ts"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.stdout:
        violations = []
        for line in result.stdout.split('\n'):
            if line.strip() and 'OpenAI no transforms' not in line and 'text-transform' not in line and 'transform-origin' not in line:
                violations.append(line)

        print(f"Remaining violations: {len(violations)}")

        if len(violations) == 0:
            print("🎉 100% OpenAI Transform Compliance achieved!")
        else:
            print("⚠️  Some violations remain:")
            for violation in violations[:10]:  # Show first 10
                print(f"   {violation}")
    else:
        print("🎉 100% OpenAI Transform Compliance achieved!")

if __name__ == "__main__":
    main()