import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // 統一用呢條 link 就可以 push 資料表
    url: env("POSTGRES_URL_NON_POOLING"), 
  },
});