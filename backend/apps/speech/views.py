from io import BytesIO

from django.shortcuts import render
import os
import json
import logging
import binascii
from django.http import FileResponse
from .translation import translationClient
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .tts.tts_driver import TTSDriver
from django.http import HttpResponse, StreamingHttpResponse
from rest_framework import status
import re

logger = logging.getLogger(__name__)

@api_view(['POST'])
def generate(request):
    """
    根据文本生成音频

    请求参数:
    - text: 要转换为音频的文本
    - voice_id: 声音ID
    - tts_type: TTS类型，默认为"minimax"
    - emotion: 情绪参数，可选值包括 "happy", "sad", "angry", "fearful", "disgusted", "surprised", "neutral"，默认"neutral"
    
    返回:
    - 音频URL
    """
    try:
        text = request.data.get('text', '')
        voice_id = request.data.get('voice_id', '')
        tts_type = request.data.get('tts_type', 'minimax')
        emotion = request.data.get('emotion', 'neutral')
        
        if not text or not voice_id:
            return Response({
                'code': '400',
                'message': '缺少必要参数: text 或 voice_id',
                'response': None
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # 生成音频
        tts_driver = TTSDriver()
        audio_file = tts_driver.synthesis(text, tts_type, voice_id, emotion=emotion)
        
        if not audio_file:
            return Response({
                'code': '500',
                'message': '音频生成失败',
                'response': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 构建URL
        audio_url = f'/tmp/{audio_file}'
        
        return Response({
            'code': '200',
            'message': '音频生成成功',
            'response': {
                'audio_url': audio_url
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"音频生成错误: {str(e)}")
        return Response({
            'code': '500',
            'message': f'服务器错误: {str(e)}',
            'response': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def generate_stream(request):
    """
    根据文本生成流式音频

    请求参数:
    - text: 要转换为音频的文本
    - voice_id: 声音ID
    - tts_type: TTS类型，默认为"minimax"
    - emotion: 情绪参数，可选值包括 "happy", "sad", "angry", "fearful", "disgusted", "surprised", "neutral"，默认"neutral"
    - format: 音频格式，默认为"mp3"
    
    返回:
    - 音频二进制数据
    """
    try:
        text = request.data.get('text', '')
        voice_id = request.data.get('voice_id', '')
        tts_type = request.data.get('tts_type', 'minimax')
        emotion = request.data.get('emotion', 'neutral')
        format_type = request.data.get('format', 'mp3')
        
        logger.info(f"流式TTS请求 - 文本:{text[:30]}..., 声音ID:{voice_id}, 格式:{format_type}")
        
        if not text or not voice_id:
            return Response({
                'code': '400',
                'message': '缺少必要参数: text 或 voice_id',
                'response': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 生成流式音频
        tts_driver = TTSDriver()
        audio_data = tts_driver.synthesis(text, tts_type, voice_id, emotion=emotion, stream=True, format=format_type)
        
        # 检查返回类型
        if isinstance(audio_data, bytes):
            logger.info(f"成功生成音频数据，大小: {len(audio_data)} 字节")
            return HttpResponse(audio_data, content_type='audio/mpeg')
        else:
            logger.error(f"TTS引擎返回了意外的数据类型: {type(audio_data)}")
            return Response({
                'code': '500',
                'message': '音频生成失败: 返回了意外的数据类型',
                'response': None
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    except Exception as e:
        logger.error(f"流式音频生成错误: {str(e)}")
        return Response({
            'code': '500',
            'message': f'服务器错误: {str(e)}',
            'response': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def delete_file(file_path):
    os.remove(file_path)

@api_view(['POST'])
def get_voices(request):
    """
    获取可用的声音列表

    请求参数:
    - type: TTS类型 (可选，仅支持minimax)
    
    返回:
    - 声音列表
    """
    try:
        tts_type = request.data.get('type')
        tts_driver = TTSDriver()
        voices = tts_driver.get_voices(tts_type)
        
        return Response({
            'code': '200',
            'message': '获取声音列表成功',
            'response': voices
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"获取声音列表错误: {str(e)}")
        return Response({
            'code': '500',
            'message': f'服务器错误: {str(e)}',
            'response': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
def get_emotions(request):
    """
    获取支持的情绪列表
    
    返回:
    - 情绪列表
    """
    try:
        tts_driver = TTSDriver()
        emotions = tts_driver.get_emotions()
        
        return Response({
            'code': '200',
            'message': '获取情绪列表成功',
            'response': emotions
        }, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"获取情绪列表错误: {str(e)}")
        return Response({
            'code': '500',
            'message': f'服务器错误: {str(e)}',
            'response': None
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def translation(request):
    """
    translation
    """
    try:
        data = json.loads(request.body.decode('utf-8'))
        text = data["text"]
        target_language = data["target_language"]
        target_result = translationClient.translation(
            text=text, target_language=target_language)
        return Response({"response": target_result, "code": "200"})
    except Exception as e:
        logger.error(f"translation error: {e}")
        return HttpResponse(status=500, content="Failed to translation error.")
