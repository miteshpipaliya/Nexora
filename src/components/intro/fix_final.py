with open('E:/Nexora/src/components/intro/IntroAnimation.tsx', 'r') as f:
    content = f.read()
# Remove all standalone * lines that are not part of JSDoc comments
# Keep only lines that are inside /* */ comments or strings
lines = content.split('\n')
cleaned = []
in_block_comment = False
for line in lines:
    stripped = line.strip()
    if stripped.startswith('/*'):
        in_block_comment = True
    if in_block_comment:
        cleaned.append(line)
        if stripped.endswith('*/'):
            in_block_comment = False
    elif not stripped.startswith('*') or (stripped == '*' and False):  # Remove orphaned * lines
        cleaned.append(line)
with open('E:/Nexora/src/components/intro/IntroAnimation.tsx', 'w') as f:
    f.write('\n'.join(cleaned))
print('Fixed')