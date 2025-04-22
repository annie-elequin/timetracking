#!/bin/sh

# Create a JavaScript file with the environment variables
cat > /usr/share/nginx/html/env-config.js << EOF
window.env = {
  REACT_APP_API_URL: "${REACT_APP_API_URL:-http://localhost:3000}"
};
EOF

# Verify the file was created
if [ ! -f /usr/share/nginx/html/env-config.js ]; then
  echo "Error: Failed to create env-config.js"
  exit 1
fi

# Start nginx
exec "$@" 