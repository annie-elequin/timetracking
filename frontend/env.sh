#!/bin/sh

# Create a JavaScript file with the environment variables
echo "window.env = {" > /usr/share/nginx/html/env-config.js
echo "  REACT_APP_API_URL: \"$REACT_APP_API_URL\"," >> /usr/share/nginx/html/env-config.js
echo "};" >> /usr/share/nginx/html/env-config.js

# Start nginx
exec "$@" 