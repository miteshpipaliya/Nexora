with open('E:/Nexora/src/components/intro/IntroAnimation.tsx', 'r') as f:
    lines = f.readlines()

# Keep lines 1-46 (0-indexed: 0-45) - the JSDoc comment including closing */
# Remove lines 47-60 (1-indexed) which are indices 46-60 (0-indexed) - the orphaned * lines
# Keep lines 61+ (0-indexed: 61+) - the component implementation
new_lines = lines[:46] + lines[61:]

with open('E:/Nexora/src/components/intro/IntroAnimation.tsx', 'w') as f:
    f.writelines(new_lines)

print('Removed orphaned lines 47-60 successfully')