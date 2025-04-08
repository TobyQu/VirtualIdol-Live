import logging
import os
import time
import json
import requests
import uuid
import binascii
from urllib.parse import urljoin

logger = logging.getLogger(__name__)

# Minimax TTS 声音列表
minimax_voices = [
    # 系统音色
    {"id": "male-qn-qingse", "name": "青涩青年音色"},
    {"id": "male-qn-jingying", "name": "精英青年音色"},
    {"id": "male-qn-badao", "name": "霸道青年音色"},
    {"id": "male-qn-daxuesheng", "name": "青年大学生音色"},
    {"id": "female-shaonv", "name": "少女音色"},
    {"id": "female-yujie", "name": "御姐音色"},
    {"id": "female-chengshu", "name": "成熟女性音色"},
    {"id": "female-tianmei", "name": "甜美女性音色"},
    {"id": "presenter_male", "name": "男性主持人"},
    {"id": "presenter_female", "name": "女性主持人"},
    {"id": "audiobook_male_1", "name": "男性有声书1"},
    {"id": "audiobook_male_2", "name": "男性有声书2"},
    {"id": "audiobook_female_1", "name": "女性有声书1"},
    {"id": "audiobook_female_2", "name": "女性有声书2"},
    # 精品音色
    {"id": "male-qn-qingse-jingpin", "name": "青涩青年音色-beta"},
    {"id": "male-qn-jingying-jingpin", "name": "精英青年音色-beta"},
    {"id": "male-qn-badao-jingpin", "name": "霸道青年音色-beta"},
    {"id": "male-qn-daxuesheng-jingpin", "name": "青年大学生音色-beta"},
    {"id": "female-shaonv-jingpin", "name": "少女音色-beta"},
    {"id": "female-yujie-jingpin", "name": "御姐音色-beta"},
    {"id": "female-chengshu-jingpin", "name": "成熟女性音色-beta"},
    {"id": "female-tianmei-jingpin", "name": "甜美女性音色-beta"},
    # 儿童及卡通音色
    {"id": "clever_boy", "name": "聪明男童"},
    {"id": "cute_boy", "name": "可爱男童"},
    {"id": "lovely_girl", "name": "萌萌女童"},
    {"id": "cartoon_pig", "name": "卡通猪小琪"},
    # 其他音色
    {"id": "bingjiao_didi", "name": "病娇弟弟"},
    {"id": "junlang_nanyou", "name": "俊朗男友"},
    {"id": "chunzhen_xuedi", "name": "纯真学弟"},
    {"id": "lengdan_xiongzhang", "name": "冷淡学长"},
    {"id": "badao_shaoye", "name": "霸道少爷"},
    {"id": "tianxin_xiaoling", "name": "甜心小玲"},
    {"id": "qiaopi_mengmei", "name": "俏皮萌妹"},
    {"id": "wumei_yujie", "name": "妩媚御姐"},
    {"id": "diadia_xuemei", "name": "嗲嗲学妹"},
    {"id": "danya_xuejie", "name": "淡雅学姐"},
    {"id": "Santa_Claus", "name": "Santa Claus"},
    {"id": "Grinch", "name": "Grinch"},
    {"id": "Rudolph", "name": "Rudolph"},
    {"id": "Arnold", "name": "Arnold"},
    {"id": "Charming_Santa", "name": "Charming Santa"},
    {"id": "Charming_Lady", "name": "Charming Lady"},
    {"id": "Sweet_Girl", "name": "Sweet Girl"},
    {"id": "Cute_Elf", "name": "Cute Elf"},
    {"id": "Attractive_Girl", "name": "Attractive Girl"},
    {"id": "Serene_Woman", "name": "Serene Woman"}
]

# 情绪列表
EMOTIONS = ["happy", "sad", "angry", "fearful", "disgusted", "surprised", "neutral"]

class MinimaxTTS:
    """Minimax TTS API 客户端"""
    API_BASE_URL = "https://api.minimax.chat/v1/"
    TTS_API_ENDPOINT = "t2a_v2"  # 使用新的API端点
    FILE_API_ENDPOINT = "file/retrieve"
    SLEEP_INTERVAL = 2  # 查询任务状态的间隔时间(秒)
    MAX_RETRIES = 10    # 最大重试次数
    
    def __init__(self):
        # 从环境变量中读取配置
        self.api_key = os.environ.get("MINIMAX_API_KEY", "")
        self.group_id = os.environ.get("MINIMAX_GROUP_ID", "")
        self.model = os.environ.get("MINIMAX_TTS_MODEL", "speech-02-turbo")
        
        if not self.api_key or not self.group_id:
            logger.warning("Minimax API配置不完整: API_KEY或GROUP_ID缺失")
    
    def create_audio(self, text: str, voice_id: str, emotion: str = "neutral", stream: bool = False) -> str:
        """创建音频文件
        
        Args:
            text: 要转换的文本
            voice_id: 声音ID
            emotion: 情绪参数，可选值："happy", "sad", "angry", "fearful", "disgusted", "surprised", "neutral"
            stream: 是否使用流式输出
            
        Returns:
            str: 生成的音频文件名或流式响应对象
        """
        if not self.api_key or not self.group_id:
            raise ValueError("Minimax API配置不完整，请设置MINIMAX_API_KEY和MINIMAX_GROUP_ID环境变量")
        
        # 验证情绪参数
        if emotion not in EMOTIONS:
            logger.warning(f"无效的情绪参数 '{emotion}'，已设为默认值 'neutral'")
            emotion = "neutral"
            
        logger.info(f"使用Minimax TTS生成音频 - 文本: {text[:50]}..., 声音ID: {voice_id}, 情绪: {emotion}, 流式: {stream}")
        
        # 准备请求数据
        request_data = {
            "model": self.model,
            "text": text,
            "stream": stream,
            "language_boost": "auto",
            "output_format": "hex",
            "voice_setting": {
                "voice_id": voice_id,
                "speed": 1,
                "vol": 1,
                "pitch": 0
            },
            "audio_setting": {
                "sample_rate": 32000,
                "bitrate": 128000,
                "format": "mp3"
            }
        }
        
        # 如果使用的是支持情绪的模型，添加情绪参数
        if self.model in ["speech-02-hd", "speech-02-turbo", "speech-01-turbo", "speech-01-hd"]:
            request_data["voice_setting"]["emotion"] = emotion
        
        # 准备请求头
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # 发送API请求
        url = f"{self.API_BASE_URL}{self.TTS_API_ENDPOINT}?GroupId={self.group_id}"
        
        if stream:
            # 返回流式响应对象
            return self._create_stream_audio(url, headers, request_data)
        else:
            # 返回非流式响应（文件名）
            return self._create_non_stream_audio(url, headers, request_data)
    
    def _create_stream_audio(self, url, headers, request_data):
        """创建流式音频响应
        
        Args:
            url: API URL
            headers: 请求头
            request_data: 请求数据
            
        Returns:
            bytes: 音频二进制数据
        """
        try:
            # 确保stream参数设置为True
            request_data['stream'] = True
            
            logger.info(f"发送流式TTS请求到 {url}")
            logger.debug(f"请求数据: {json.dumps(request_data, ensure_ascii=False)}")
            
            # 设置超时时间并发送请求
            response = requests.post(url, headers=headers, json=request_data, stream=True, timeout=30)
            response.raise_for_status()
            
            logger.info(f"流式TTS请求成功，状态码: {response.status_code}")
            
            # 收集所有音频数据
            all_audio_data = bytearray()
            
            # 处理流式响应
            for chunk in response.raw:
                if not chunk:
                    continue
                    
                # 检查是否以 "data:" 开头
                if chunk[:5] == b'data:':
                    try:
                        # 解析JSON数据
                        data = json.loads(chunk[5:])
                        if "data" in data and "extra_info" not in data:
                            if "audio" in data["data"]:
                                # 获取音频hex数据
                                audio_hex = data["data"]["audio"]
                                # 转换为二进制
                                audio_binary = bytes.fromhex(audio_hex)
                                all_audio_data.extend(audio_binary)
                            elif isinstance(data["data"], str):
                                # 有时数据可能直接是hex字符串
                                audio_binary = bytes.fromhex(data["data"])
                                all_audio_data.extend(audio_binary)
                    except Exception as e:
                        logger.error(f"处理流式数据块错误: {str(e)}")
                elif chunk[:1] == b'{':
                    # 尝试解析为JSON
                    try:
                        data = json.loads(chunk)
                        if "data" in data:
                            if isinstance(data["data"], dict) and "audio" in data["data"]:
                                audio_hex = data["data"]["audio"]
                                audio_binary = bytes.fromhex(audio_hex)
                                all_audio_data.extend(audio_binary)
                            elif isinstance(data["data"], str):
                                audio_binary = bytes.fromhex(data["data"])
                                all_audio_data.extend(audio_binary)
                    except Exception as e:
                        logger.error(f"解析JSON数据块错误: {str(e)}")
                else:
                    # 检查是否直接为MP3数据（以FF FB或FF F3开头）
                    if len(chunk) > 2 and chunk[0] == 0xFF and (chunk[1] == 0xFB or chunk[1] == 0xF3 or chunk[1] == 0xF2):
                        all_audio_data.extend(chunk)
            
            # 检查是否收集到数据
            if len(all_audio_data) == 0:
                logger.error("未能从流式响应中收集到任何音频数据")
                raise ValueError("未能获取有效的音频数据")
                
            logger.info(f"成功收集流式音频数据，大小: {len(all_audio_data)} 字节")
            
            # 返回完整的二进制音频数据
            return bytes(all_audio_data)
            
        except requests.RequestException as e:
            logger.error(f"Minimax TTS 流式API请求失败: {str(e)}")
            raise ValueError(f"Minimax TTS 流式API请求失败: {str(e)}")
    
    def _create_non_stream_audio(self, url, headers, request_data):
        """创建非流式音频文件
        
        Args:
            url: API URL
            headers: 请求头
            request_data: 请求数据
            
        Returns:
            str: 保存的音频文件名，或bytes: 音频二进制数据
        """
        try:
            # 确保stream参数为False
            request_data['stream'] = False
            
            logger.info(f"发送非流式TTS请求到 {url}")
            logger.debug(f"请求数据: {json.dumps(request_data, ensure_ascii=False)}")
            
            response = requests.post(url, headers=headers, json=request_data)
            response.raise_for_status()
            
            # 检查响应类型
            content_type = response.headers.get('Content-Type', '')
            logger.debug(f"响应Content-Type: {content_type}")
            
            # 如果是直接返回的二进制数据
            if 'audio/' in content_type or 'application/octet-stream' in content_type:
                logger.info("检测到音频响应，直接处理为二进制数据")
                audio_data = response.content
                
                # 生成唯一文件名并保存
                file_name = f"{uuid.uuid4().hex}.mp3"
                file_path = os.path.join("tmp", file_name)
                
                # 确保目录存在
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # 写入文件
                with open(file_path, "wb") as f:
                    f.write(audio_data)
                    
                logger.info(f"Minimax TTS音频文件保存成功: {file_path}")
                return file_name
            
            # 如果是JSON响应
            try:
                response_data = response.json()
                logger.debug(f"Minimax TTS API JSON响应: {response_data}")
                
                # 检查响应状态
                base_resp = response_data.get("base_resp", {})
                if base_resp and base_resp.get("status_code") != 0:
                    error_msg = base_resp.get("status_msg", "未知错误")
                    logger.error(f"Minimax TTS API错误: {error_msg}")
                    raise ValueError(f"Minimax TTS API错误: {error_msg}")
                
                # 获取音频数据
                hex_data = None
                
                # 检查不同层级的数据结构
                if "data" in response_data:
                    data_field = response_data["data"]
                    if isinstance(data_field, str):
                        # 数据直接是hex字符串
                        hex_data = data_field
                    elif isinstance(data_field, dict):
                        # 数据是嵌套对象
                        if "audio" in data_field:
                            hex_data = data_field["audio"]
                        elif "data" in data_field:
                            nested_data = data_field["data"]
                            if isinstance(nested_data, str):
                                hex_data = nested_data
                
                if not hex_data:
                    logger.error(f"无法从响应中提取音频数据: {response_data}")
                    raise ValueError("响应中未包含音频数据")
                
                # 将十六进制字符串转换为二进制数据
                try:
                    audio_data = binascii.unhexlify(hex_data)
                    
                    # 生成唯一文件名并保存
                    file_name = f"{uuid.uuid4().hex}.mp3"
                    file_path = os.path.join("tmp", file_name)
                    
                    # 确保目录存在
                    os.makedirs(os.path.dirname(file_path), exist_ok=True)
                    
                    # 写入文件
                    with open(file_path, "wb") as f:
                        f.write(audio_data)
                        
                    logger.info(f"Minimax TTS音频文件保存成功: {file_path}, 大小: {len(audio_data)} 字节")
                    return file_name
                    
                except binascii.Error as e:
                    logger.error(f"解码十六进制音频数据失败: {str(e)}")
                    raise ValueError(f"解码十六进制音频数据失败: {str(e)}")
                
            except ValueError:
                # 重新抛出已处理的ValueError
                raise
            except Exception as e:
                logger.error(f"处理非流式响应数据失败: {str(e)}")
                # 尝试直接以二进制形式处理响应
                audio_data = response.content
                
                # 生成唯一文件名并保存
                file_name = f"{uuid.uuid4().hex}.mp3"
                file_path = os.path.join("tmp", file_name)
                
                # 确保目录存在
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # 写入文件
                with open(file_path, "wb") as f:
                    f.write(audio_data)
                
                logger.info(f"以二进制模式保存音频文件: {file_path}, 大小: {len(audio_data)} 字节")
                return file_name
                
        except requests.RequestException as e:
            logger.error(f"Minimax TTS API请求失败: {str(e)}")
            raise ValueError(f"Minimax TTS API请求失败: {str(e)}") 