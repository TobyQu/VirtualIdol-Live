import os
from django.conf import settings
from django.shortcuts import render, get_object_or_404
import json
from django.http import JsonResponse, HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt

from .character import role_package_manage
from .insight.bilibili_api.bili_live_client import lazy_bilibili_live
from .process import get_process_core
from .serializers import CustomRoleSerializer, UploadedImageSerializer, UploadedVrmModelSerializer, \
    UploadedRolePackageModelSerializer
from .config import get_sys_config
from .config.sys_config import sys_code
from .models import CustomRoleModel, BackgroundImageModel, VrmModel, RolePackageModel, SysConfigModel
from .emotion.emotion_state_manager import EmotionStateManager
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
def chat(request):
    '''
      聊天
    :param request:
    :return:
    '''
    try:
        data = json.loads(request.body.decode('utf-8'))
        query = data["query"]
        you_name = data["you_name"]
        user_id = data.get("user_id", 1)  # 默认用户ID
        role_id = data.get("role_id", 1)  # 默认角色ID
        
        logger.info(f"收到聊天请求: query={query}, you_name={you_name}, user_id={user_id}, role_id={role_id}")
        
        # 获取情感状态管理器
        emotion_manager = EmotionStateManager.get_manager(user_id, role_id)
        
        # 更新情绪状态
        emotion_state = emotion_manager.update_emotion(query)
        
        # 处理聊天
        response = get_process_core().chat(you_name=you_name, query=query)
        
        # 获取当前情绪状态
        current_emotion = emotion_manager.get_current_emotion()
        
        return Response({
            "code": 0,
            "message": "success",
            "response": response,
            "emotion": {
                "type": current_emotion.emotion.value,
                "intensity": current_emotion.intensity
            }
        })
    except Exception as e:
        logger.error(f"聊天处理出错: {str(e)}", exc_info=True)
        return Response({
            "code": 500,
            "message": str(e),
            "response": None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def options_response(request):
    response = HttpResponse()
    return response


@csrf_exempt
@api_view(['POST', 'OPTIONS'])
def save_config(request):
    if request.method == 'OPTIONS':
        return options_response(request)
    """保存系统配置"""
    try:
        sys_code = "adminSettings"  # 固定的配置代码
        config_data = request.data
        logger.info(f"接收到的配置长度: {len(str(config_data))}")
        
        # 确保配置数据是字典
        if not isinstance(config_data, dict):
            try:
                config_data = json.loads(config_data)
            except json.JSONDecodeError:
                return Response({
                    'code': 400,
                    'message': '无效的JSON格式',
                    'data': None
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 转换为JSON字符串，用于保存
        config_json = json.dumps(config_data, ensure_ascii=False)
        
        # 查找现有配置
        try:
            config_obj = SysConfigModel.objects.get(code=sys_code)
            logger.info(f"找到现有配置，ID: {config_obj.id}")
            
            # 更新配置
            config_obj.config = config_json
            config_obj.save()
            logger.info("配置已成功更新")
        except SysConfigModel.DoesNotExist:
            logger.info(f"创建新配置, 代码: {sys_code}")
            config_obj = SysConfigModel.objects.create(
                code=sys_code,
                config=config_json
            )
            logger.info("新配置已成功创建")
            
        # 更新单例配置，更新前先进行兼容处理
        
        # 处理zep相关配置，如果前端发送了zep_memory配置，后端会忽略它
        try:
            if 'memoryStorageConfig' in config_data and 'zep_memory' in config_data['memoryStorageConfig']:
                logger.info("检测到zep_memory配置，后端将忽略它")
                # 不需要特别处理，因为后端代码已经不再使用zep_memory相关配置
        except Exception as e:
            logger.warning(f"处理zep配置时出错: {str(e)}")
            
        # 更新系统配置单例
        get_sys_config().save(config_data)
        
        # 从数据库中读取并打印，确认保存是否成功
        try:
            saved_config = SysConfigModel.objects.get(code=sys_code)
            logger.info(f"保存后从数据库读取配置 ID: {saved_config.id}, 代码: {saved_config.code}")
            logger.info(f"保存后配置内容的前100个字符: {saved_config.config[:100]}...")
            
            # 检查配置是否是有效的JSON
            try:
                json_content = json.loads(saved_config.config)
                logger.info(f"配置是有效的JSON，包含 {len(json_content)} 个顶级键")
                logger.info(f"配置中的顶级键: {list(json_content.keys())}")
            except json.JSONDecodeError as je:
                logger.error(f"保存的配置不是有效的JSON: {je}")
                
        except SysConfigModel.DoesNotExist:
            logger.error(f"保存后无法找到配置，代码: {sys_code}")
        except Exception as read_error:
            logger.error(f"读取保存的配置时出错: {str(read_error)}")
        
        return Response({
            'code': 0,
            'message': 'success',
            'data': None
        })
    except Exception as e:
        logger.error(f"保存配置时出错: {str(e)}", exc_info=True)
        return Response({
            'code': 500,
            'message': str(e),
            'data': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['GET', 'OPTIONS'])
def get_config(request):
    if request.method == 'OPTIONS':
        return options_response(request)
    """获取系统配置"""
    try:
        config = SysConfigModel.objects.first()
        if config:
            # 检查配置是否为空或无效JSON
            try:
                json_config = json.loads(config.config)
                if not json_config:  # 空字典
                    logger.warning("配置存在但为空，返回默认配置")
                    return Response({
                        'code': 0,
                        'message': 'success',
                        'data': {
                            'config': """{"characterConfig": {"character": 1, "character_name": "爱莉", "yourName": "用户", "vrmModel": "/assets/vrm/default.vrm", "vrmModelType": "system"}, "languageModelConfig": {"openai": {"OPENAI_API_KEY": "", "OPENAI_BASE_URL": ""}, "ollama": {"OLLAMA_API_BASE": "http://localhost:11434", "OLLAMA_API_MODEL_NAME": "qwen:7b"}, "zhipuai": {"ZHIPUAI_API_KEY": "SK-"}}, "enableProxy": false, "httpProxy": "http://host.docker.internal:23457", "httpsProxy": "https://host.docker.internal:23457", "socks5Proxy": "socks5://host.docker.internal:23457", "conversationConfig": {"conversationType": "default", "languageModel": "openai"}, "memoryStorageConfig": {"faissMemory": {"dataDir": "storage/memory"}, "enableLongMemory": false, "enableSummary": false, "languageModelForSummary": "openai", "enableReflection": false, "languageModelForReflection": "openai"}, "background_url": "/assets/backgrounds/default.png", "enableLive": false, "liveStreamingConfig": {"B_ROOM_ID": "", "B_COOKIE": ""}, "ttsConfig": {"ttsVoiceId": "female-shaonv", "emotion": "neutral", "ttsType": "minimax"}}"""
                        }
                    })
                return Response({
                    'code': 0,
                    'message': 'success',
                    'data': {
                        'config': config.config
                    }
                })
            except json.JSONDecodeError:
                logger.warning("配置存在但不是有效的JSON，返回默认配置")
                return Response({
                    'code': 0,
                    'message': 'success',
                    'data': {
                        'config': """{"characterConfig": {"character": 1, "character_name": "爱莉", "yourName": "用户", "vrmModel": "/assets/vrm/default.vrm", "vrmModelType": "system"}, "languageModelConfig": {"openai": {"OPENAI_API_KEY": "", "OPENAI_BASE_URL": ""}, "ollama": {"OLLAMA_API_BASE": "http://localhost:11434", "OLLAMA_API_MODEL_NAME": "qwen:7b"}, "zhipuai": {"ZHIPUAI_API_KEY": "SK-"}}, "enableProxy": false, "httpProxy": "http://host.docker.internal:23457", "httpsProxy": "https://host.docker.internal:23457", "socks5Proxy": "socks5://host.docker.internal:23457", "conversationConfig": {"conversationType": "default", "languageModel": "openai"}, "memoryStorageConfig": {"faissMemory": {"dataDir": "storage/memory"}, "enableLongMemory": false, "enableSummary": false, "languageModelForSummary": "openai", "enableReflection": false, "languageModelForReflection": "openai"}, "background_url": "/assets/backgrounds/default.png", "enableLive": false, "liveStreamingConfig": {"B_ROOM_ID": "", "B_COOKIE": ""}, "ttsConfig": {"ttsVoiceId": "female-shaonv", "emotion": "neutral", "ttsType": "minimax"}}"""
                    }
                })
        else:
            logger.info("配置不存在，返回默认配置")
            return Response({
                'code': 0,
                'message': 'success',
                'data': {
                    'config': """{"characterConfig": {"character": 1, "character_name": "爱莉", "yourName": "用户", "vrmModel": "/assets/vrm/default.vrm", "vrmModelType": "system"}, "languageModelConfig": {"openai": {"OPENAI_API_KEY": "", "OPENAI_BASE_URL": ""}, "ollama": {"OLLAMA_API_BASE": "http://localhost:11434", "OLLAMA_API_MODEL_NAME": "qwen:7b"}, "zhipuai": {"ZHIPUAI_API_KEY": "SK-"}}, "enableProxy": false, "httpProxy": "http://host.docker.internal:23457", "httpsProxy": "https://host.docker.internal:23457", "socks5Proxy": "socks5://host.docker.internal:23457", "conversationConfig": {"conversationType": "default", "languageModel": "openai"}, "memoryStorageConfig": {"faissMemory": {"dataDir": "storage/memory"}, "enableLongMemory": false, "enableSummary": false, "languageModelForSummary": "openai", "enableReflection": false, "languageModelForReflection": "openai"}, "background_url": "/assets/backgrounds/default.png", "enableLive": false, "liveStreamingConfig": {"B_ROOM_ID": "", "B_COOKIE": ""}, "ttsConfig": {"ttsVoiceId": "female-shaonv", "emotion": "neutral", "ttsType": "minimax"}}"""
                }
            })
    except Exception as e:
        logger.error(f"获取配置时出错: {str(e)}", exc_info=True)
        return Response({
            'code': 500,
            'message': str(e),
            'data': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# @api_view(['GET'])
# def reflection_generation(request):
#     '''
#       生成新记忆
#     :return:
#     '''
#     rg = ReflectionGeneration()
#     rg.generation(role_name="Maiko")
#     timestamp = time.time()
#     expr = f'timestamp <= {timestamp}'
#     result = singleton_sys_config.memory_storage_driver.pageQuery(
#         1, 100, expr=expr)
#     return Response({"response": result, "code": "200"})


@api_view(['GET'])
def clear_memory(request):
    '''
      删除测试记忆
    :return:
    '''
    result = get_sys_config().memory_storage_driver.clear("alan")
    return Response({"response": result, "code": "200"})


@api_view(['GET'])
def custom_role_list(request):
    result = CustomRoleModel.objects.all()
    serializer = CustomRoleSerializer(data=result, many=True)
    serializer.is_valid()
    result = serializer.data
    return Response({"response": result, "code": "200"})


@api_view(['GET'])
def custom_role_detail(request, pk):
    role = get_object_or_404(CustomRoleModel, pk=pk)
    return Response({"response": role, "code": "200"})


@api_view(['POST'])
def create_custom_role(request):
    data = request.data  # 获取请求的 JSON 数据

    # 从 JSON 数据中提取字段值
    role_name = data.get('role_name')
    persona = data.get('persona')
    personality = data.get('personality')
    scenario = data.get('scenario')
    examples_of_dialogue = data.get('examples_of_dialogue')
    custom_role_template_type = data.get('custom_role_template_type')

    # 创建 CustomRoleModel 实例并保存到数据库
    custom_role = CustomRoleModel(
        role_name=role_name,
        persona=persona,
        personality=personality,
        scenario=scenario,
        examples_of_dialogue=examples_of_dialogue,
        custom_role_template_type=custom_role_template_type,
        role_package_id=-1
    )
    custom_role.save()

    return Response({"response": "Data added to database", "code": "200"})


@api_view(['POST'])
def edit_custom_role(request, pk):
    role = get_object_or_404(CustomRoleModel, pk=pk)
    data = request.data

    # 从 JSON 数据中提取字段值
    role.role_name = data.get('role_name', role.role_name)
    role.persona = data.get('persona', role.persona)
    role.personality = data.get('personality', role.personality)
    role.scenario = data.get('scenario', role.scenario)
    role.examples_of_dialogue = data.get('examples_of_dialogue', role.examples_of_dialogue)
    role.custom_role_template_type = data.get('custom_role_template_type', role.custom_role_template_type)
    role.role_package_id = data.get('role_package_id', role.role_package_id)

    role.save()
    return Response({"response": "ok", "code": "200"})


@api_view(['POST'])
def delete_custom_role(request, pk):
    role = get_object_or_404(CustomRoleModel, pk=pk)
    # 删除对应的角色安装包
    if role.role_package_id != -1:
        # 删除角色安装包数据
        role_package = get_object_or_404(RolePackageModel, pk=role.role_package_id)
        role_package_path = role_package.role_package.path
        # 删除角色安装包文件
        role_package_manage.uninstall(role_package_path)
        role_package.delete()
    role.delete()

    return Response({"response": "ok", "code": "200"})


@api_view(['POST'])
def delete_background_image(request, pk):
    # 删除数据
    background_image_model = get_object_or_404(BackgroundImageModel, pk=pk)
    background_image_model.delete()

    # 获取要删除的文件路径
    file_path = os.path.join(
        settings.MEDIA_ROOT, str(background_image_model.image))
    # 删除关联的文件
    if os.path.exists(file_path):
        os.remove(file_path)

    return Response({"response": "ok", "code": "200"})


@api_view(['POST'])
def upload_background_image(request):
    """
    Upload a background image.
    """
    serializer = UploadedImageSerializer(data=request.data)
    if serializer.is_valid():
        # 获取上传文件对象
        uploaded_file = request.data['image']
        # 获取上传文件的原始文件名
        original_filename = uploaded_file.name
        serializer.save(original_name=original_filename)
        return Response({"response": "ok", "code": "200"})
    return Response({"response": "no", "code": "500"})


@api_view(['GET'])
def show_background_image(request):
    """
    Retrieve a list of uploaded background images.
    """
    images = BackgroundImageModel.objects.all()
    serializer = UploadedImageSerializer(images, many=True)
    return Response({"response": serializer.data, "code": "200"})


@api_view(['POST'])
def delete_vrm_model(request, pk):
    """
    删除VRM模型数据
    """
    # 删除数据
    vrm_model = get_object_or_404(VrmModel, pk=pk)
    vrm_model.delete()

    # 获取要删除的文件路径
    file_path = os.path.join(settings.MEDIA_ROOT, str(vrm_model.vrm))
    # 删除关联的文件
    if os.path.exists(file_path):
        os.remove(file_path)

    return Response({"response": "ok", "code": "200"})


@api_view(['POST'])
def upload_vrm_model(request):
    """
    上传VRM模型
    """
    serializer = UploadedVrmModelSerializer(data=request.data)
    if serializer.is_valid():
        # 获取上传文件对象
        uploaded_file = request.data['vrm']
        # 获取上传文件的原始文件名
        original_filename = uploaded_file.name
        serializer.save(original_name=original_filename, type="user")
        return Response({"response": "ok", "code": "200"})
    logger.error(serializer.errors)
    return Response({"response": "no", "code": "500"})


@api_view(['POST'])
def upload_role_package(request):
    """
    上传角色安装包
    """
    serializer = UploadedRolePackageModelSerializer(data=request.data)
    if serializer.is_valid():
        # 获取上传角色安装包
        role_package_model = serializer.save(role_name="", dataset_json_path="", embed_index_idx_path="",
                                             system_prompt_txt_path="")

        # 解压和安装角色包
        role_package_path = role_package_model.role_package.path
        role_name, dataset_json_path, embed_index_idx_path, system_prompt_txt_path = role_package_manage.install(
            role_package_path)
        db_role_package_model = get_object_or_404(RolePackageModel, pk=role_package_model.id)
        db_role_package_model.role_name = role_name
        db_role_package_model.dataset_json_path = dataset_json_path
        db_role_package_model.embed_index_idx_path = embed_index_idx_path
        db_role_package_model.system_prompt_txt_path = system_prompt_txt_path
        db_role_package_model.save()

        # 保存为新角色
        role_name = role_name
        persona = role_package_manage.load_system_prompt(system_prompt_txt_path)
        personality = ""
        scenario = ""
        examples_of_dialogue = "此参数会动态从角色安装包中获取，请勿修改"
        custom_role_template_type = "zh"

        # 创建 CustomRoleModel 实例并保存到数据库
        custom_role = CustomRoleModel(
            role_name=role_name,
            persona=persona,
            personality=personality,
            scenario=scenario,
            examples_of_dialogue=examples_of_dialogue,
            custom_role_template_type=custom_role_template_type,
            role_package_id=role_package_model.id
        )
        custom_role.save()

        return Response({"response": "ok", "code": "200"})
    logger.error(serializer.errors)
    return Response({"response": "no", "code": "500"})


@api_view(['GET'])
def show_user_vrm_models(request):
    """
    获取VRM模型列表
    """
    vrm_models = VrmModel.objects.all()
    serializer = UploadedVrmModelSerializer(vrm_models, many=True)
    return Response({"response": serializer.data, "code": "200"})


@api_view(['GET'])
def show_system_vrm_models(request):
    '''
      获取角色模型列表
    :param request:
    :return:
    '''
    vrm_models = [
        {
            "id": "sys_01",
            "type": "system",
            "original_name": "わたあめ_03.vrm",
            "vrm": "わたあめ_03.vrm"
        },
        {
            "id": "sys_02",
            "type": "system",
            "original_name": "わたあめ_02.vrm",
            "vrm": "わたあめ_02.vrm"
        },
        {
            "id": "sys_03",
            "type": "system",
            "original_name": "hailey.vrm",
            "vrm": "hailey.vrm"
        },
        {
            "id": "sys_04",
            "type": "system",
            "original_name": "后藤仁.vrm",
            "vrm": "后藤仁.vrm"
        },
        {
            "id": "sys_05",
            "type": "system",
            "original_name": "aili.vrm",
            "vrm": "aili.vrm"
        }
    ]
    return Response({"response": vrm_models, "code": "200"})


@api_view(['GET'])
def get_emotion_state(request):
    """获取当前情感状态"""
    try:
        user_id = request.GET.get('user_id', 1)
        role_id = request.GET.get('role_id', 1)
        
        emotion_manager = EmotionStateManager.get_manager(user_id, role_id)
        current_emotion = emotion_manager.get_current_emotion()
        
        return Response({
            "code": 0,
            "message": "success",
            "data": {
                "emotion": current_emotion.emotion.value,
                "intensity": current_emotion.intensity,
                "last_update": current_emotion.last_update
            }
        })
    except Exception as e:
        logger.error(f"获取情感状态失败: {str(e)}", exc_info=True)
        return Response({
            "code": 500,
            "message": str(e),
            "data": None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def update_emotion_preference(request):
    """更新情感偏好"""
    try:
        data = json.loads(request.body.decode('utf-8'))
        user_id = data.get('user_id', 1)
        role_id = data.get('role_id', 1)
        emotion = data.get('emotion')
        response = data.get('response')
        feedback = data.get('feedback', 1)
        
        if not all([emotion, response]):
            return Response({
                "code": 400,
                "message": "Missing required parameters",
                "data": None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        emotion_manager = EmotionStateManager.get_manager(user_id, role_id)
        emotion_manager.track_user_preference(emotion, response, feedback)
        
        return Response({
            "code": 0,
            "message": "success",
            "data": None
        })
    except Exception as e:
        logger.error(f"更新情感偏好失败: {str(e)}", exc_info=True)
        return Response({
            "code": 500,
            "message": str(e),
            "data": None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['GET', 'OPTIONS'])
def check_memory_status(request):
    if request.method == 'OPTIONS':
        return options_response(request)
    """检查长期记忆模块状态"""
    try:
        from .config import get_sys_config
        import os
        
        # 获取系统配置
        sys_config = get_sys_config()
        
        # 准备状态信息
        memory_status = {
            "memory_enabled": sys_config.enable_longMemory,
            "memory_driver_initialized": False,
            "faiss_index_exists": False,
            "faiss_index_info": {},
            "metadata_db_exists": False,
            "metadata_db_count": 0
        }
        
        # 检查记忆驱动是否初始化
        if hasattr(sys_config, 'memory_storage_driver') and sys_config.memory_storage_driver is not None:
            memory_status["memory_driver_initialized"] = True
            
            # 如果驱动初始化，检查长期记忆存储是否初始化
            if hasattr(sys_config.memory_storage_driver, 'long_memory_storage') and sys_config.memory_storage_driver.long_memory_storage is not None:
                # 获取配置信息
                faiss_storage = sys_config.memory_storage_driver.long_memory_storage
                
                # 检查索引文件
                memory_status["faiss_index_exists"] = os.path.exists(faiss_storage.index_path)
                if memory_status["faiss_index_exists"]:
                    memory_status["faiss_index_info"] = {
                        "path": faiss_storage.index_path,
                        "size": os.path.getsize(faiss_storage.index_path),
                        "dimensions": faiss_storage.dimension,
                        "vectors_count": faiss_storage.index.ntotal if hasattr(faiss_storage, 'index') else 0,
                        "last_modified": os.path.getmtime(faiss_storage.index_path)
                    }
                
                # 检查元数据数据库
                memory_status["metadata_db_exists"] = os.path.exists(faiss_storage.metadata_db)
                if memory_status["metadata_db_exists"]:
                    try:
                        # 连接到数据库检查记录数
                        import sqlite3
                        conn = sqlite3.connect(faiss_storage.metadata_db)
                        cursor = conn.cursor()
                        cursor.execute("SELECT COUNT(*) FROM memory_metadata")
                        count = cursor.fetchone()[0]
                        memory_status["metadata_db_count"] = count
                        conn.close()
                    except Exception as e:
                        memory_status["metadata_db_error"] = str(e)
        
        # 检查是否存在数据目录
        config = sys_config.config_manager.get_config()
        data_dir = config.memoryStorageConfig.faissMemory.dataDir
        memory_status["data_dir"] = data_dir
        memory_status["data_dir_exists"] = os.path.exists(data_dir)
        
        return Response({
            'code': 0,
            'message': 'success',
            'data': memory_status
        })
    except Exception as e:
        import traceback
        logger.error(f"检查长期记忆状态时出错: {str(e)}\n{traceback.format_exc()}")
        return Response({
            'code': 500,
            'message': str(e),
            'data': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST', 'OPTIONS'])
def reinitialize_memory_service(request):
    if request.method == 'OPTIONS':
        return options_response(request)
    """手动重新初始化长期记忆服务"""
    try:
        from .config import get_sys_config
        
        # 获取系统配置
        sys_config = get_sys_config()
        
        # 获取现有状态以便记录
        had_memory_driver = hasattr(sys_config, 'memory_storage_driver') and sys_config.memory_storage_driver is not None
        had_long_memory = (had_memory_driver and 
                          hasattr(sys_config.memory_storage_driver, 'long_memory_storage') and 
                          sys_config.memory_storage_driver.long_memory_storage is not None)
        
        logger.info(f"开始重新初始化长期记忆，现状：驱动存在={had_memory_driver}，长期记忆存在={had_long_memory}")
        
        # 关闭现有的记忆模块（如果存在）
        if had_memory_driver:
            try:
                logger.info(f"关闭现有记忆模块，长期记忆状态: {had_long_memory}")
                
                # 清理资源
                sys_config.memory_storage_driver = None
            except Exception as e:
                logger.error(f"关闭现有记忆模块失败: {str(e)}")
        
        # 重新初始化记忆模块
        logger.info("开始重新初始化记忆模块...")
        try:
            # 先检查长期记忆是否启用
            if not sys_config.enable_longMemory:
                logger.warning("长期记忆功能未启用，但用户请求初始化")
                
                # 尝试启用长期记忆
                config = sys_config.config_manager.get_config()
                config.memoryStorageConfig.enableLongMemory = True
                sys_config.config_manager.update_config(config.model_dump())
                
                # 更新实例
                sys_config.enable_longMemory = True
                logger.info("已自动启用长期记忆功能")
            
            sys_config._init_memory_storage()
            logger.info("重新初始化记忆模块完成")
        except Exception as init_e:
            logger.error(f"重新初始化记忆模块出错: {str(init_e)}")
            import traceback
            logger.error(traceback.format_exc())
            return Response({
                'code': 500,
                'message': f"重新初始化记忆模块失败: {str(init_e)}",
                'data': {
                    'memory_initialized': False,
                    'long_memory_initialized': False,
                    'long_memory_enabled': sys_config.enable_longMemory,
                    'error': str(init_e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 检查初始化结果
        memory_initialized = (hasattr(sys_config, 'memory_storage_driver') and 
                             sys_config.memory_storage_driver is not None)
        
        long_memory_initialized = False
        if memory_initialized:
            long_memory_initialized = (hasattr(sys_config.memory_storage_driver, 'long_memory_storage') and 
                                     sys_config.memory_storage_driver.long_memory_storage is not None)
        
        logger.info(f"记忆模块重新初始化结果 - 记忆驱动: {memory_initialized}, 长期记忆: {long_memory_initialized}")
        
        return Response({
            'code': 0,
            'message': 'success',
            'data': {
                'memory_initialized': memory_initialized,
                'long_memory_initialized': long_memory_initialized,
                'long_memory_enabled': sys_config.enable_longMemory
            }
        })
    except Exception as e:
        import traceback
        logger.error(f"重新初始化长期记忆模块失败: {str(e)}\n{traceback.format_exc()}")
        return Response({
            'code': 500,
            'message': str(e),
            'data': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
