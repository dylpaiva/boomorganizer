# Database Schema

Schema decisions are expressed through SQLAlchemy metadata and Alembic migrations. PostgreSQL is the authoritative production store; derived balance views must remain reconstructable from inventory events.
