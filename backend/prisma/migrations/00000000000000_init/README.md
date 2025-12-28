Migration: init

This migration creates initial tables: User, TableType, PoolTable, Drink, Session, TabLineItem, Transaction.

Apply with Prisma migrate or run the SQL against your Postgres instance.

Example:
  npx prisma migrate deploy
or for dev:
  npx prisma migrate dev --name init
