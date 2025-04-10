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

# 安装关键依赖
install_key_dependencies() {
    print_message "安装关键依赖..."
    pip install --quiet Django==4.2.1 djangorestframework==3.14.0 django-cors-headers==4.2.0 python-dotenv==1.0.0 numpy==1.24.3 urllib3==2.0.7 openai==1.12.0 channels==4.0.0 daphne==4.0.0 || {
        print_error "安装关键依赖失败"
        return 1
    }
    return 0
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
        
        # 确保基本依赖已安装
        print_message "检查基本依赖..."
        install_key_dependencies || {
            print_error "安装基本依赖失败"
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
        
        # 安装基本依赖
        print_message "安装基本依赖..."
        install_key_dependencies || {
            print_error "安装基本依赖失败"
            return 1
        }
    fi
    
    print_message "conda环境设置成功"
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

# 重置数据库
reset_database() {
    print_message "重置数据库..."
    
    # 确保处于项目根目录
    local CURRENT_DIR=$(pwd)
    cd $(dirname "$0") # 移动到脚本所在的目录（项目根目录）
    
    # 设置PYTHONPATH
    export PYTHONPATH=$(pwd)
    
    # 找出所有迁移文件目录
    local MIGRATION_DIRS=(
        "backend/apps/migrations"
        "backend/apps/chatbot/migrations"
        "backend/apps/speech/migrations"
    )
    
    # 删除数据库文件
    print_message "删除旧数据库文件..."
    rm -f db/db.sqlite3
    mkdir -p db
    touch db/db.sqlite3
    
    # 删除所有非初始迁移文件
    for dir in "${MIGRATION_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            print_message "重置迁移文件: $dir"
            # 保留 __init__.py 和 0001_initial.py
            find "$dir" -type f -not -name "__init__.py" -not -name "0001_initial.py" -delete
        fi
    done
    
    # 进入backend目录执行Django命令
    cd backend
    
    # 重新创建迁移
    print_message "创建新的迁移..."
    python3 manage.py makemigrations || {
        print_error "创建迁移文件失败"
        cd "$CURRENT_DIR"
        return 1
    }
    
    # 应用迁移
    print_message "应用迁移..."
    python3 manage.py migrate --fake-initial || {
        print_error "应用迁移失败"
        cd "$CURRENT_DIR"
        return 1
    }
    
    # 恢复原来的目录
    cd "$CURRENT_DIR"
    return 0
}

# 初始化数据库和配置
initialize_database_and_config() {
    print_message "初始化数据库和默认配置..."
    
    # 确保处于项目根目录
    local CURRENT_DIR=$(pwd)
    cd $(dirname "$0")
    
    # 1. 确保数据库目录和文件存在
    mkdir -p db
    touch db/db.sqlite3
    chmod 777 db/db.sqlite3
    
    # 2. 进入backend目录
    cd backend
    
    # 确保conda环境已激活
    print_message "确保conda环境已激活..."
    eval "$(conda shell.bash hook)"
    conda activate VirtualIdol-Live || {
        print_error "激活conda环境失败"
        cd "$CURRENT_DIR"
        return 1
    }
    
    # 3. 安装所有依赖
    print_message "安装所有依赖..."
    # 首先安装关键依赖
    install_key_dependencies || {
        print_error "安装关键依赖失败"
        cd "$CURRENT_DIR"
        return 1
    }
    
    # 然后安装requirements.txt中的所有依赖
    if [ -f "./requirements.txt" ]; then
        print_message "从requirements.txt安装所有依赖..."
        pip install -r ./requirements.txt || {
            print_error "安装requirements.txt依赖失败"
            cd "$CURRENT_DIR"
            return 1
        }
    else
        print_error "requirements.txt 文件不存在"
        cd "$CURRENT_DIR"
        return 1
    fi
    
    # 4. 创建迁移文件
    print_message "创建数据库迁移..."
    python3 manage.py makemigrations || {
        print_error "创建迁移文件失败"
        cd "$CURRENT_DIR"
        return 1
    }
    
    # 5. 应用迁移
    print_message "应用数据库迁移..."
    python3 manage.py migrate || {
        print_error "应用迁移失败"
        cd "$CURRENT_DIR"
        return 1
    }
    
    # 6. 初始化默认配置
    print_message "初始化默认配置..."
    python3 << EOF
import django
import os
import json
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.chatbot.models import SysConfigModel
from apps.chatbot.config.sys_config import sys_code

# 检查配置是否存在
if not SysConfigModel.objects.filter(code=sys_code).exists():
    print("创建默认配置...")
    default_config = """{"characterConfig": {"character": 1, "character_name": "爱莉", "yourName": "用户", "vrmModel": "/assets/vrm/default.vrm", "vrmModelType": "system"}, "languageModelConfig": {"openai": {"OPENAI_API_KEY": "", "OPENAI_BASE_URL": ""}, "ollama": {"OLLAMA_API_BASE": "http://localhost:11434", "OLLAMA_API_MODEL_NAME": "qwen:7b"}, "zhipuai": {"ZHIPUAI_API_KEY": "SK-"}}, "enableProxy": false, "httpProxy": "http://host.docker.internal:23457", "httpsProxy": "https://host.docker.internal:23457", "socks5Proxy": "socks5://host.docker.internal:23457", "conversationConfig": {"conversationType": "default", "languageModel": "openai"}, "memoryStorageConfig": {"zep_memory": {"zep_url": "http://localhost:8881", "zep_optional_api_key": "optional_api_key"}, "milvusMemory": {"host": "127.0.0.1", "port": "19530", "user": "user", "password": "Milvus", "dbName": "default"}, "enableLongMemory": false, "enableSummary": false, "languageModelForSummary": "openai", "enableReflection": false, "languageModelForReflection": "openai"}, "background_url": "/assets/backgrounds/default.png", "enableLive": false, "liveStreamingConfig": {"B_ROOM_ID": "", "B_COOKIE": ""}, "ttsConfig": {"ttsVoiceId": "female-shaonv", "emotion": "neutral", "ttsType": "minimax"}}"""
    SysConfigModel.objects.create(code=sys_code, config=default_config)
    print("默认配置创建成功")
else:
    print("配置已存在，跳过创建")
EOF
    
    # 返回到原来的目录
    cd "$CURRENT_DIR"
    print_message "数据库和配置初始化完成"
    return 0
}

# 启动后端服务
start_backend() {
    print_step "启动后端服务..."
    
    # 保存当前目录
    local CURRENT_DIR=$(pwd)
    
    # 确保处于项目根目录
    cd $(dirname "$0")
    
    # 设置PYTHONPATH
    PROJECT_ROOT=$(pwd)
    export PYTHONPATH=$PROJECT_ROOT:$PYTHONPATH
    
    # 首先初始化数据库和配置
    initialize_database_and_config || {
        print_error "数据库和配置初始化失败"
        exit 1
    }
    
    # 进入backend目录
    cd backend
    
    # 激活conda环境
    print_message "激活 conda 环境..."
    # 确保conda已正确初始化
    eval "$(conda shell.bash hook)"
    conda activate VirtualIdol-Live || {
        print_error "激活conda环境失败"
        cd "$CURRENT_DIR"
        exit 1
    }
    
    # 安装依赖
    print_message "安装后端依赖..."
    # 首先安装关键依赖
    install_key_dependencies || {
        print_error "安装关键依赖失败"
        cd "$CURRENT_DIR"
        exit 1
    }
    
    # 然后安装requirements.txt中的所有依赖
    if [ -f "./requirements.txt" ]; then
        print_message "从requirements.txt安装所有依赖..."
        pip install -r ./requirements.txt || {
            print_error "安装requirements.txt依赖失败"
            cd "$CURRENT_DIR"
            exit 1
        }
    else
        print_error "requirements.txt 文件不存在"
        cd "$CURRENT_DIR"
        exit 1
    fi
    
    # 最后检查Django能否正确导入
    if ! python3 -c "import django" &> /dev/null; then
        print_error "Django仍然无法导入，启动将失败"
        cd "$CURRENT_DIR"
        exit 1
    fi
    
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
    
    # 返回到原来的目录
    cd "$CURRENT_DIR"
}

# 启动前端服务
start_frontend() {
    print_step "启动前端服务..."
    
    # 保存当前目录
    local CURRENT_DIR=$(pwd)
    
    # 确保处于项目根目录
    cd $(dirname "$0")
    cd frontend
    
    # 安装依赖
    print_message "安装前端依赖..."
    bun install || {
        print_error "安装前端依赖失败"
        cd "$CURRENT_DIR"
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
        cd "$CURRENT_DIR"
        exit 1
    fi
    
    print_message "前端服务启动成功"
    
    # 返回到原来的目录
    cd "$CURRENT_DIR"
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
        print_error "conda命令不可用，请先安装conda"
        exit 1
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