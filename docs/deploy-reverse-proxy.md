# Advanced: Deploying big-AGI behind a Reverse Proxy

Note: if you don't have a reverse proxy set up, you can skip this guide.

If you're deploying big-AGI behind a reverse proxy, you may want to configure your proxy to support streaming output.
This guide provides instructions on how to configure your reverse proxy to support streaming output from big-AGI.

This is for advanced deployments, and you should have a basic understanding of how reverse proxies work.

## Nginx Configuration

If you're using Nginx as your reverse proxy, add the following configuration to your server block:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        # ...your specific proxy_pass configuration, example below...
        proxy_pass http://localhost:3000;  # Assuming big-AGI is running on port 3000
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        # ...

        # Important: Disable buffering for the streaming responses (SSE)
        chunked_transfer_encoding on;   # Turn on chunked transfer encoding
        proxy_buffering off;            # Turn off proxy buffering
        proxy_cache off;                # Turn off caching
        tcp_nodelay on;                 # Turn on TCP NODELAY option, disable delay ACK algorithm
        tcp_nopush on;                  # Turn on TCP NOPUSH option, disable Nagle algorithm

        # Important: Longer timeouts (5 min)
        keepalive_timeout 300;
        proxy_connect_timeout 300;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
}
```

This configuration disables caching and buffering, enables chunked transfer encoding, and adjusts TCP settings to optimize for streaming content.

## teamAI: Custom Domain with SSL

Full setup for running teamAI on a custom domain with Nginx and Let's Encrypt.

### 1. Environment variable

Set `APP_URL` in your `.env` to the full domain URL:

```bash
APP_URL=https://your-domain.com
```

### 2. Install Nginx and Certbot

```bash
# Debian/Ubuntu
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

### 3. Nginx configuration

Create `/etc/nginx/sites-available/teamai`:

```nginx
server {
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Required for AI streaming (SSE)
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        tcp_nodelay on;
        tcp_nopush on;

        # Longer timeouts for AI operations (5 min)
        keepalive_timeout 300;
        proxy_connect_timeout 300;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }

    # Allow large file uploads (attachments, images)
    client_max_body_size 50m;

    listen 80;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/teamai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. SSL with Let's Encrypt

Obtain and install a certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

Certbot automatically modifies the Nginx config to add SSL directives. The resulting config will include:

```nginx
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
```

### 5. Auto-renewal

Certbot installs a systemd timer for automatic renewal. Verify it is active:

```bash
sudo systemctl status certbot.timer
```

To test renewal manually:

```bash
sudo certbot renew --dry-run
```

### 6. CORS (if needed)

If your frontend and API are on different origins, add CORS headers in the Nginx location block:

```nginx
    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

    if ($request_method = OPTIONS) {
        return 204;
    }
```

For standard teamAI deployments (same domain for frontend and API), CORS headers are not required.

## Troubleshooting

If you're experiencing issues with streaming not working, especially when deploying behind a reverse proxy,
ensure that your proxy is configured to support streaming output as described above.

## Additional Resources

- For Docker deployments, see our [Docker Deployment Guide](deploy-docker.md)
- For Kubernetes deployments, see our [Kubernetes Deployment Guide](deploy-k8s.md)
- For general installation instructions, see our [Installation Guide](installation.md)

If you continue to experience issues, please reach out to our [community support channels](../README.md#-get-involved).
