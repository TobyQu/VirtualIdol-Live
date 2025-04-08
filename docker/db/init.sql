-- 创建数据库
CREATE DATABASE virtualwife;

-- 创建用户并授权
CREATE USER virtualwife WITH PASSWORD 'virtualwife';
GRANT ALL PRIVILEGES ON DATABASE virtualwife TO virtualwife;

-- 连接到新创建的数据库
\c virtualwife

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; 