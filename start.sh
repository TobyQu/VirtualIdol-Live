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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 设置Conda环境
setup_conda_env() {
    print_message "设置conda环境..."
    
    # 确保conda已经初始化
    # 尝试使用conda的shell.bash hook初始化
    eval "$(conda shell.bash hook)"
    
    # 检查VirtualIdol-Live环境是否存在
    if conda env list | grep -q "VirtualIdol-Live"; then
        print_message "激活 VirtualIdol-Live 环境..."
        conda activate VirtualIdol-Live || {
            print_error "激活 VirtualIdol-Live 环境失败"
            return 1
        }
    else
        # 创建环境
        print_message "创建 VirtualIdol-Live 环境 (Python 3.11)..."
        conda create -y -n VirtualIdol-Live python=3.11 || {
            print_error "创建 VirtualIdol-Live 环境失败"
            return 1
        }
        
        print_message "激活 VirtualIdol-Live 环境..."
        conda activate VirtualIdol-Live || {
            print_error "激活 VirtualIdol-Live 环境失败"
            return 1
        }
    fi
    
    print_message "conda环境设置成功"
    return 0
}

# 初始化conda函数 - 使用用户提供的脚本
init_conda() {
    print_message "初始化conda环境..."
    
    # >>> conda initialize >>>
    # !! Contents within this block are managed by 'conda init' !!
    __conda_setup="$('/opt/miniconda3/bin/conda' 'shell.bash' 'hook' 2> /dev/null)"
    if [ $? -eq 0 ]; then
        eval "$__conda_setup"
    else
        if [ -f "/opt/miniconda3/etc/profile.d/conda.sh" ]; then
            . "/opt/miniconda3/etc/profile.d/conda.sh"
        else
            export PATH="/opt/miniconda3/bin:$PATH"
        fi
    fi
    unset __conda_setup
    # <<< conda initialize <<<
    
    # 确认conda命令可用
    if ! command -v conda &> /dev/null; then
        print_error "conda初始化失败"
        return 1
    fi
    
    # 运行conda init以确保可以使用conda activate
    conda init bash
    
    print_message "conda初始化成功"
    return 0
}

# 检查服务是否可用
check_service() {
    local url=$1
    local max_attempts=$2
    local attempt=1
    local wait_time=2

    while [ $attempt -le $max_attempts ]; do
        if [[ $url == ws://* ]]; then
            # 对于 WebSocket，我们只检查端口是否开放
            local port=$(echo $url | sed -n 's/.*:\([0-9]*\).*/\1/p')
            if nc -z localhost $port; then
                return 0
            fi
        else
            # 对于 HTTP，我们尝试访问 URL
            if curl -s "$url" > /dev/null; then
                return 0
            fi
        fi
        print_message "等待服务启动... (尝试 $attempt/$max_attempts)"
        sleep $wait_time
        attempt=$((attempt + 1))
    done
    return 1
}

# 检查是否安装了必要的工具
check_requirements() {
    print_step "检查环境要求..."
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        print_error "未安装 Python3"
        exit 1
    fi
    
    # 不检查conda命令，因为我们已经初始化了conda
    
    # 检查 bun
    if ! command -v bun &> /dev/null; then
        print_message "未安装 bun，正在安装..."
        curl -fsSL https://bun.sh/install | bash
        # 更新当前 shell 的 PATH
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"
    fi
    
    print_message "环境检查完成"
}

# 启动后端服务
start_backend() {
    print_step "启动后端服务..."
    cd backend
    
    # 激活conda环境
    print_message "激活 conda 环境..."
    # 确保conda已正确初始化
    eval "$(conda shell.bash hook)"
    conda activate VirtualIdol-Live || {
        print_error "激活conda环境失败"
        exit 1
    }
    
    # 安装依赖
    print_message "安装后端依赖..."
    pip install -r requirements.txt || {
        print_error "安装后端依赖失败"
        exit 1
    }
    
    # 运行数据库迁移
    print_message "运行数据库迁移..."
    python3 manage.py migrate || {
        print_error "数据库迁移失败"
        exit 1
    }
    
    # 启动后端服务
    print_message "启动 Django 服务器..."
    python3 manage.py runserver 0.0.0.0:8000 &
    
    # 保存后端进程 ID
    BACKEND_PID=$!
    
    # 等待后端服务启动
    if ! check_service "http://localhost:8000/admin" 10; then
        print_error "后端 HTTP 服务启动失败"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    # 等待 WebSocket 服务启动
    if ! check_service "ws://localhost:8000/ws" 10; then
        print_error "后端 WebSocket 服务启动失败"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    
    print_message "后端服务启动成功"
    cd ..
}

# 启动前端服务
start_frontend() {
    print_step "启动前端服务..."
    cd frontend
    
    # 安装依赖
    print_message "安装前端依赖..."
    bun install || {
        print_error "安装前端依赖失败"
        exit 1
    }
    
    # 启动前端服务
    print_message "启动 Next.js 开发服务器..."
    bun run dev &
    
    # 保存前端进程 ID
    FRONTEND_PID=$!
    
    # 等待前端服务启动
    if ! check_service "http://localhost:3000" 10; then
        print_error "前端服务启动失败"
        kill $FRONTEND_PID 2>/dev/null
        exit 1
    fi
    
    print_message "前端服务启动成功"
    cd ..
}

# 清理函数
cleanup() {
    print_message "正在关闭服务..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    exit 0
}

# 主函数
main() {
    print_message "开始启动 VirtualWife 项目..."
    
    # 检查conda命令是否可用
    if command -v conda &> /dev/null; then
        # conda命令可用，设置环境
        setup_conda_env || {
            print_error "设置conda环境失败"
            exit 1
        }
    else
        # conda命令不可用，尝试初始化
        init_conda || {
            print_error "初始化conda环境失败"
            exit 1
        }
        
        # 初始化成功后，设置环境
        setup_conda_env || {
            print_error "设置conda环境失败"
            exit 1
        }
    fi
    
    # 检查环境要求
    check_requirements
    
    # 启动后端
    start_backend
    
    # 启动前端
    start_frontend
    
    # 注册清理函数
    trap cleanup SIGINT SIGTERM
    
    print_message "所有服务已启动:"
    print_message "前端: http://localhost:3000"
    print_message "后端: http://localhost:8000"
    print_message "按 Ctrl+C 停止服务"
    
    # 等待用户中断
    wait
}

# 运行主函数
main 