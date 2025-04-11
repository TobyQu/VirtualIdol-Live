#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
存储检查脚本 - 验证SQLite和FAISS存储是否正常工作
"""

import os
import sys
import sqlite3
import json
import datetime
import re
from pathlib import Path

# 处理faiss模块导入
FAISS_AVAILABLE = False
try:
    import faiss
    import numpy as np
    FAISS_AVAILABLE = True
    print("✅ FAISS模块已安装")
except ImportError:
    print("⚠️  未安装FAISS模块，将跳过FAISS相关检查")

def print_section(title):
    """打印带格式的段落标题"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def find_sqlite_databases(search_dir):
    """查找给定目录及其子目录中的所有SQLite数据库文件"""
    print_section("查找SQLite数据库文件")
    
    sqlite_files = []
    
    # 用于识别SQLite数据库文件的模式
    sqlite_patterns = [
        r'.*\.db$',
        r'.*\.sqlite$',
        r'.*\.sqlite3$',
        r'.*memory_metadata\.db$'
    ]
    
    print(f"扫描目录: {search_dir}")
    
    # 查找符合模式的文件
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            file_path = os.path.join(root, file)
            
            # 检查文件名是否匹配模式
            if any(re.match(pattern, file, re.IGNORECASE) for pattern in sqlite_patterns):
                # 额外检查是否为SQLite数据库
                if is_sqlite_database(file_path):
                    sqlite_files.append(file_path)
                    print(f"✅ 找到SQLite数据库: {file_path}")
    
    if not sqlite_files:
        print("❌ 未找到SQLite数据库文件")
    else:
        print(f"共找到 {len(sqlite_files)} 个SQLite数据库文件")
    
    return sqlite_files

def find_faiss_indexes(search_dir):
    """查找给定目录及其子目录中的所有FAISS索引文件"""
    print_section("查找FAISS索引文件")
    
    if not FAISS_AVAILABLE:
        print("⚠️  未安装FAISS模块，跳过查找FAISS索引")
        return []
    
    faiss_files = []
    
    # 用于识别FAISS索引文件的模式
    faiss_patterns = [
        r'.*\.index$',
        r'memory\.index$'
    ]
    
    print(f"扫描目录: {search_dir}")
    
    # 查找符合模式的文件
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            file_path = os.path.join(root, file)
            
            # 检查文件名是否匹配模式
            if any(re.match(pattern, file, re.IGNORECASE) for pattern in faiss_patterns):
                # 添加到索引文件列表
                faiss_files.append(file_path)
                print(f"✅ 找到可能的FAISS索引: {file_path}")
    
    if not faiss_files:
        print("❌ 未找到FAISS索引文件")
    else:
        print(f"共找到 {len(faiss_files)} 个可能的FAISS索引文件")
    
    return faiss_files

def is_sqlite_database(file_path):
    """检查文件是否为SQLite数据库"""
    try:
        # 尝试打开文件
        conn = sqlite3.connect(file_path)
        cursor = conn.cursor()
        
        # 尝试执行一个简单的查询
        cursor.execute("SELECT sqlite_version()")
        conn.close()
        return True
    except:
        return False

def check_sqlite_database(db_path):
    """检查SQLite数据库内容"""
    print_section(f"检查SQLite数据库: {os.path.basename(db_path)}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 获取数据库信息
        cursor.execute("PRAGMA database_list")
        db_info = cursor.fetchall()
        print(f"数据库路径: {db_path}")
        print(f"大小: {os.path.getsize(db_path)/1024:.2f} KB")
        print(f"最后修改时间: {datetime.datetime.fromtimestamp(os.path.getmtime(db_path))}")
        
        # 获取表信息
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        if tables:
            print(f"\n找到 {len(tables)} 个表:")
            for table in tables:
                table_name = table[0]
                print(f"  表: {table_name}")
                
                # 获取表的列信息
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = cursor.fetchall()
                print(f"    列数: {len(columns)}")
                
                # 获取表中的记录数
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"    记录数: {count}")
                
                # 如果表是memory_metadata
                if table_name == 'memory_metadata' and count > 0:
                    print("\n    记忆数据摘要:")
                    try:
                        # 按所有者分组统计
                        cursor.execute("SELECT owner, COUNT(*) FROM memory_metadata GROUP BY owner")
                        owners = cursor.fetchall()
                        if owners:
                            print("\n    按所有者统计记忆数量:")
                            for owner, owner_count in owners:
                                print(f"      - {owner}: {owner_count}条")
                        
                        # 获取最近的记录
                        cursor.execute("""
                            SELECT id, text, sender, owner, datetime(timestamp, 'unixepoch', 'localtime'), importance_score
                            FROM memory_metadata 
                            ORDER BY timestamp DESC 
                            LIMIT 3
                        """)
                        rows = cursor.fetchall()
                        if rows:
                            print("\n    最近3条记忆:")
                            for i, row in enumerate(rows):
                                id, text, sender, owner, timestamp, importance = row
                                print(f"      [{i+1}] ID: {id}, 时间: {timestamp}, 重要性: {importance}")
                                print(f"          发送者: {sender}, 所有者: {owner}")
                                print(f"          内容: {text[:50]}{'...' if len(text) > 50 else ''}")
                    except:
                        print("      无法查询memory_metadata表详细信息")
        else:
            print("数据库中没有表")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 检查SQLite数据库出错: {str(e)}")
        return False

def check_faiss_index(index_path):
    """检查FAISS索引内容"""
    print_section(f"检查FAISS索引: {os.path.basename(index_path)}")
    
    if not FAISS_AVAILABLE:
        print("❌ FAISS模块未安装，无法检查索引内容")
        return False
    
    try:
        # 尝试加载索引
        index = faiss.read_index(index_path)
        
        # 显示索引信息
        print(f"索引路径: {index_path}")
        print(f"大小: {os.path.getsize(index_path)/1024:.2f} KB")
        print(f"最后修改时间: {datetime.datetime.fromtimestamp(os.path.getmtime(index_path))}")
        print(f"向量维度: {index.d}")
        print(f"向量总数: {index.ntotal}")
        
        # 对于IVF索引，显示额外信息
        if isinstance(index, faiss.IndexIVF):
            print(f"聚类中心数量: {index.nlist}")
            print(f"已训练: {'是' if index.is_trained else '否'}")
            print(f"搜索深度: {index.nprobe}")
        
        return True
        
    except Exception as e:
        print(f"❌ 检查FAISS索引出错: {str(e)}")
        return False

def test_sqlite_functionality():
    """测试SQLite基本功能"""
    print_section("SQLite功能测试")
    
    try:
        # 创建临时数据库
        temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp")
        os.makedirs(temp_dir, exist_ok=True)
        temp_db = os.path.join(temp_dir, "test_sqlite.db")
        
        print(f"使用测试数据库: {temp_db}")
        
        # 连接数据库
        conn = sqlite3.connect(temp_db)
        cursor = conn.cursor()
        
        # 创建测试表
        cursor.execute("CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT, value REAL)")
        print("✅ 创建表成功")
        
        # 插入数据
        cursor.execute("INSERT INTO test_table (name, value) VALUES (?, ?)", ("测试项目", 123.45))
        conn.commit()
        print("✅ 插入数据成功")
        
        # 查询数据
        cursor.execute("SELECT * FROM test_table")
        rows = cursor.fetchall()
        print(f"✅ 查询数据成功，找到 {len(rows)} 条记录")
        
        # 清理
        cursor.execute("DROP TABLE test_table")
        conn.commit()
        conn.close()
        
        # 删除临时文件
        os.remove(temp_db)
        print("✅ 清理测试数据库成功")
        
        print("✅ SQLite功能正常")
        return True
        
    except Exception as e:
        print(f"❌ SQLite功能测试失败: {str(e)}")
        if 'conn' in locals():
            conn.close()
        if os.path.exists(temp_db):
            try:
                os.remove(temp_db)
            except:
                pass
        return False

def check_db_directory(project_root):
    """专门检查项目根目录下的db目录"""
    print_section("检查db目录")
    
    db_dir = os.path.join(project_root, "db")
    if not os.path.isdir(db_dir):
        print(f"❌ db目录不存在: {db_dir}")
        return
    
    print(f"✅ 找到db目录: {db_dir}")
    
    # 列出db目录内容
    db_files = os.listdir(db_dir)
    print(f"db目录中包含 {len(db_files)} 个文件/目录:")
    
    db_sqlite_files = []
    other_files = []
    
    for item in db_files:
        item_path = os.path.join(db_dir, item)
        if os.path.isfile(item_path):
            if item.endswith('.db') or item.endswith('.sqlite') or item.endswith('.sqlite3'):
                if is_sqlite_database(item_path):
                    db_sqlite_files.append(item_path)
                    print(f"  - 📄 {item} (SQLite数据库)")
                else:
                    other_files.append(item_path)
                    print(f"  - 📄 {item} (非SQLite数据库文件)")
            else:
                other_files.append(item_path)
                print(f"  - 📄 {item}")
        else:
            print(f"  - 📁 {item}/ (目录)")
    
    # 检查SQLite数据库文件
    if db_sqlite_files:
        print(f"\n在db目录中找到 {len(db_sqlite_files)} 个SQLite数据库文件")
        for db_file in db_sqlite_files:
            print(f"\n检查数据库文件: {os.path.basename(db_file)}")
            try:
                conn = sqlite3.connect(db_file)
                cursor = conn.cursor()
                
                # 获取表信息
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = cursor.fetchall()
                
                if tables:
                    print(f"  包含 {len(tables)} 个表:")
                    for table in tables:
                        table_name = table[0]
                        # 获取表中的记录数
                        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                        count = cursor.fetchone()[0]
                        print(f"    - {table_name} ({count}条记录)")
                        
                        # 获取表结构
                        cursor.execute(f"PRAGMA table_info({table_name})")
                        columns = cursor.fetchall()
                        if columns:
                            print(f"      列: {', '.join(col[1] for col in columns)}")
                        
                        # 显示示例数据
                        if count > 0:
                            cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
                            row = cursor.fetchone()
                            if row:
                                print(f"      示例数据: {row}")
                else:
                    print("  数据库没有表")
                
                conn.close()
                
            except Exception as e:
                print(f"  ❌ 检查数据库出错: {str(e)}")
    
    return db_dir

def main():
    """主函数"""
    print("存储检查工具 v1.0")
    print("扫描整个项目查找SQLite数据库和FAISS索引\n")
    
    # 获取项目根目录
    project_root = os.path.dirname(os.path.abspath(__file__))
    print(f"项目根目录: {project_root}")
    
    # 测试SQLite基本功能
    sqlite_functional = test_sqlite_functionality()
    if not sqlite_functional:
        print("❌ SQLite基本功能测试失败，继续检查...")
    
    # 特别检查db目录
    db_dir = check_db_directory(project_root)
    
    # 查找所有SQLite数据库
    sqlite_dbs = find_sqlite_databases(project_root)
    
    # 查找所有FAISS索引
    faiss_indexes = find_faiss_indexes(project_root)
    
    # 检查每个SQLite数据库
    if sqlite_dbs:
        for db_path in sqlite_dbs:
            check_sqlite_database(db_path)
    
    # 检查每个FAISS索引
    if FAISS_AVAILABLE and faiss_indexes:
        for index_path in faiss_indexes:
            check_faiss_index(index_path)
    
    # 输出结果摘要
    print_section("检查结果摘要")
    
    # SQLite状态
    if sqlite_functional:
        print("✅ SQLite功能测试通过")
    else:
        print("❌ SQLite功能测试失败")
    
    # db目录
    if db_dir:
        print(f"✅ 找到db目录: {db_dir}")
    else:
        print("❌ 未找到db目录")
    
    # 数据库文件
    if sqlite_dbs:
        print(f"✅ 找到 {len(sqlite_dbs)} 个SQLite数据库文件")
        for db in sqlite_dbs:
            found_memory_metadata = False
            try:
                conn = sqlite3.connect(db)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_metadata'")
                if cursor.fetchone():
                    found_memory_metadata = True
                conn.close()
            except:
                pass
            
            if found_memory_metadata:
                print(f"  ✅ {db} (包含记忆表)")
            else:
                print(f"  - {db}")
    else:
        print("❌ 未找到SQLite数据库文件")
    
    # FAISS索引
    if FAISS_AVAILABLE:
        if faiss_indexes:
            print(f"✅ 找到 {len(faiss_indexes)} 个FAISS索引文件")
            for index in faiss_indexes:
                print(f"  - {index}")
        else:
            print("❌ 未找到FAISS索引文件")
    else:
        print("⚠️  FAISS模块未安装，无法检查索引文件")
    
    print("\n检查完成!")

if __name__ == "__main__":
    main() 