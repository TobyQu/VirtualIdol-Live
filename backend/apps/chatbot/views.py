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
        logger.info(f"收到聊天请求: query={query}, you_name={you_name}")
        
        get_process_core().chat(you_name=you_name, query=query)
        
        return Response({
            "code": 0,  # 修改为0以与其他API保持一致
            "message": "success", 
            "response": "OK"  # 保留response字段以兼容前端
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
        logger.info("接收到保存配置的请求")
        config_data = request.data
        logger.debug(f"配置数据类型: {type(config_data)}, 数据: {config_data}")
        
        # 确保获取的是字符串形式的配置
        if isinstance(config_data, dict):
            config_json = json.dumps(config_data, ensure_ascii=False)
        else:
            config_json = str(config_data)
            
        logger.info(f"保存的配置数据: {config_json[:100]}...")
        
        # 查找现有配置
        config_obj = SysConfigModel.objects.filter(code=sys_code).first()
        
        if config_obj:
            logger.info(f"更新现有配置, ID: {config_obj.id}, 代码: {config_obj.code}")
            config_obj.config = config_json
            config_obj.save()
            logger.info("配置已成功更新")
        else:
            logger.info(f"创建新配置, 代码: {sys_code}")
            config_obj = SysConfigModel.objects.create(
                code=sys_code,
                config=config_json
            )
            logger.info("新配置已成功创建")
            
        # 更新单例配置
        get_sys_config()
        
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
                            'config': """{"characterConfig": {"character": 1, "character_name": "爱莉", "yourName": "用户", "vrmModel": "/assets/vrm/default.vrm", "vrmModelType": "system"}, "languageModelConfig": {"openai": {"OPENAI_API_KEY": "", "OPENAI_BASE_URL": ""}, "ollama": {"OLLAMA_API_BASE": "http://localhost:11434", "OLLAMA_API_MODEL_NAME": "qwen:7b"}, "zhipuai": {"ZHIPUAI_API_KEY": "SK-"}}, "enableProxy": false, "httpProxy": "http://host.docker.internal:23457", "httpsProxy": "https://host.docker.internal:23457", "socks5Proxy": "socks5://host.docker.internal:23457", "conversationConfig": {"conversationType": "default", "languageModel": "openai"}, "memoryStorageConfig": {"zep_memory": {"zep_url": "http://localhost:8881", "zep_optional_api_key": "optional_api_key"}, "milvusMemory": {"host": "127.0.0.1", "port": "19530", "user": "user", "password": "Milvus", "dbName": "default"}, "enableLongMemory": false, "enableSummary": false, "languageModelForSummary": "openai", "enableReflection": false, "languageModelForReflection": "openai"}, "background_url": "/assets/backgrounds/default.png", "enableLive": false, "liveStreamingConfig": {"B_ROOM_ID": "", "B_COOKIE": ""}, "ttsConfig": {"ttsVoiceId": "female-shaonv", "emotion": "neutral", "ttsType": "minimax"}}"""
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
                        'config': """{"characterConfig": {"character": 1, "character_name": "爱莉", "yourName": "用户", "vrmModel": "/assets/vrm/default.vrm", "vrmModelType": "system"}, "languageModelConfig": {"openai": {"OPENAI_API_KEY": "", "OPENAI_BASE_URL": ""}, "ollama": {"OLLAMA_API_BASE": "http://localhost:11434", "OLLAMA_API_MODEL_NAME": "qwen:7b"}, "zhipuai": {"ZHIPUAI_API_KEY": "SK-"}}, "enableProxy": false, "httpProxy": "http://host.docker.internal:23457", "httpsProxy": "https://host.docker.internal:23457", "socks5Proxy": "socks5://host.docker.internal:23457", "conversationConfig": {"conversationType": "default", "languageModel": "openai"}, "memoryStorageConfig": {"zep_memory": {"zep_url": "http://localhost:8881", "zep_optional_api_key": "optional_api_key"}, "milvusMemory": {"host": "127.0.0.1", "port": "19530", "user": "user", "password": "Milvus", "dbName": "default"}, "enableLongMemory": false, "enableSummary": false, "languageModelForSummary": "openai", "enableReflection": false, "languageModelForReflection": "openai"}, "background_url": "/assets/backgrounds/default.png", "enableLive": false, "liveStreamingConfig": {"B_ROOM_ID": "", "B_COOKIE": ""}, "ttsConfig": {"ttsVoiceId": "female-shaonv", "emotion": "neutral", "ttsType": "minimax"}}"""
                    }
                })
        else:
            logger.info("配置不存在，返回默认配置")
            return Response({
                'code': 0,
                'message': 'success',
                'data': {
                    'config': """{"characterConfig": {"character": 1, "character_name": "爱莉", "yourName": "用户", "vrmModel": "/assets/vrm/default.vrm", "vrmModelType": "system"}, "languageModelConfig": {"openai": {"OPENAI_API_KEY": "", "OPENAI_BASE_URL": ""}, "ollama": {"OLLAMA_API_BASE": "http://localhost:11434", "OLLAMA_API_MODEL_NAME": "qwen:7b"}, "zhipuai": {"ZHIPUAI_API_KEY": "SK-"}}, "enableProxy": false, "httpProxy": "http://host.docker.internal:23457", "httpsProxy": "https://host.docker.internal:23457", "socks5Proxy": "socks5://host.docker.internal:23457", "conversationConfig": {"conversationType": "default", "languageModel": "openai"}, "memoryStorageConfig": {"zep_memory": {"zep_url": "http://localhost:8881", "zep_optional_api_key": "optional_api_key"}, "milvusMemory": {"host": "127.0.0.1", "port": "19530", "user": "user", "password": "Milvus", "dbName": "default"}, "enableLongMemory": false, "enableSummary": false, "languageModelForSummary": "openai", "enableReflection": false, "languageModelForReflection": "openai"}, "background_url": "/assets/backgrounds/default.png", "enableLive": false, "liveStreamingConfig": {"B_ROOM_ID": "", "B_COOKIE": ""}, "ttsConfig": {"ttsVoiceId": "female-shaonv", "emotion": "neutral", "ttsType": "minimax"}}"""
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
