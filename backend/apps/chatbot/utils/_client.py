import aiohttp
import logging

logger = logging.getLogger(__name__)

class Client:
    async def _make_request(self, url: str, data: dict) -> dict:
        """发送HTTP请求"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.debug(f"API请求成功: {url}")
                        return result
                    else:
                        error_text = await response.text()
                        logger.error(f"API请求失败: {response.status} - {error_text}")
                        raise Exception(f"API请求失败: {response.status}")
        except Exception as e:
            logger.error(f"API请求异常: {str(e)}")
            raise 