# Docker Secrets Directory

This directory contains secret files for production deployments.

## Setup

1. Create the secret files:
   - `db_password.txt` - Database password
   - `jwt_secret.txt` - JWT signing secret

2. Add your production secrets (one value per file, no newline):
   ```bash
   echo -n "your-secure-db-password" > db_password.txt
   echo -n "your-256-bit-jwt-secret" > jwt_secret.txt
   ```

3. Ensure proper permissions:
   ```bash
   chmod 600 db_password.txt jwt_secret.txt
   ```

## Usage

Run with production profile:
```bash
docker-compose --profile production up -d backend-prod
```

## Security Notes

- Never commit actual secrets to version control
- Use strong, randomly generated passwords
- Rotate secrets periodically
- Consider using HashiCorp Vault or AWS Secrets Manager for production
