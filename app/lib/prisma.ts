// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// 優先使用 Pooling URL 加快讀取速度，如果冇就跌落去 Non-Pooling
const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING;

// 建立連線池同 Adapter
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 匯出已經駁好 Adapter 嘅 PrismaClient
export const prisma = new PrismaClient({ adapter });