#!/bin/bash

# 设置颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查数据库文件
check_database() {
    print_message "检查数据库文件..."
    
    # 确保数据库目录存在
    mkdir -p backend/storage/db
    
    # 检查数据库文件是否存在
    if [ ! -f "backend/storage/db/db.sqlite3" ]; then
        print_message "数据库文件不存在，创建空数据库文件..."
        touch backend/storage/db/db.sqlite3
        chmod 777 backend/storage/db/db.sqlite3
    fi
}

# 启动后端服务
start_backend() {
    print_message "启动后端服务..."
    
    # 保存当前目录
    local CURRENT_DIR=$(pwd)
    
    # 确保处于项目根目录
    cd $(dirname "$0")
    
    # 检查数据库文件
    check_database
    
    # 设置PYTHONPATH和环境变量
    export PYTHONPATH=$(pwd):$PYTHONPATH
    # 启用简化配置模式，大幅提升启动速度
    export USE_LITE_CONFIG=true
    
    # 进入backend目录
    cd backend
    
    # 激活conda环境
    print_message "激活conda环境..."
    eval "$(conda shell.bash hook)"
    conda activate VirtualIdol-Live || {
        print_error "激活conda环境失败"
        cd "$CURRENT_DIR"
        exit 1
    }
    
    # 检查并执行数据库迁移
    print_message "检查数据库迁移状态..."
    MIGRATION_CHECK=$(python3 manage.py showmigrations --list | grep -c "\[ \]")
    if [ $MIGRATION_CHECK -gt 0 ]; then
        print_message "发现未应用的迁移，正在应用数据库迁移..."
        python3 manage.py migrate
    else
        print_message "数据库迁移已是最新状态"
    fi
    
    # 启动后端服务
    print_message "启动Django服务器..."
    python3 manage.py runserver 0.0.0.0:8000 &
    
    # 保存后端进程ID
    BACKEND_PID=$!
    print_message "后端服务已启动，PID: $BACKEND_PID"
    
    # 返回到原来的目录
    cd "$CURRENT_DIR"
}

# 启动前端服务
start_frontend() {
    print_message "启动前端服务..."
    
    # 保存当前目录
    local CURRENT_DIR=$(pwd)
    
    # 确保处于项目根目录
    cd $(dirname "$0")
    cd frontend
    
    # 启动前端服务
    print_message "启动Next.js开发服务器..."
    bun run dev &
    
    # 保存前端进程ID
    FRONTEND_PID=$!
    print_message "前端服务已启动，PID: $FRONTEND_PID"
    
    # 返回到原来的目录
    cd "$CURRENT_DIR"
}

# 清理函数
cleanup() {
    print_message "正在关闭服务..."
    if [ ! -z "$BACKEND_PID" ]; then
        print_message "关闭后端服务 (PID: $BACKEND_PID)"
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        print_message "关闭前端服务 (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# 主函数
main() {
    print_message "启动VirtualWife开发环境..."
    
    # 启动后端
    start_backend
    
    # 等待几秒钟让后端初始化
    print_message "等待后端服务初始化..."
    sleep 3
    
    # 启动前端
    start_frontend
    
    # 注册清理函数
    trap cleanup SIGINT SIGTERM
    
    print_message "所有服务已启动:"
    print_message "前端: http://localhost:3000"
    print_message "后端: http://localhost:8000"
    print_message "按Ctrl+C停止服务"
    
    # 等待用户中断
    wait
}

# 运行主函数
main 