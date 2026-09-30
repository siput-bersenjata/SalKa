# Database Safety & Anti-Data Loss Protocol

## Mandatory Rule
Before executing any deployment, database schema update, or migration:
1. **Never reset or drop production data**: Commands like `prisma migrate reset`, `prisma db push --force-reset`, or any SQL `TRUNCATE`/`DROP` are strictly forbidden unless explicitly requested in writing by the user.
2. **Preserve User Accounts, Products, and Transactions**:
   All user-created data (including products, accounts, staff, transactions) must be preserved across deployments.
3. **Additive Schema Updates Only**:
   All schema modifications in `prisma/schema.prisma` must be non-destructive (e.g. nullable fields or default values).
4. **Starter Products For New Tenants**:
   Every new user registration must automatically receive default starter products so that their store is not blank.
