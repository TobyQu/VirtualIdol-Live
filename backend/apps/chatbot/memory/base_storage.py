from abc import ABC, abstractmethod
from typing import List, Optional


class BaseStorage(ABC):

    '''统一记忆存储抽象类,基于当前抽象类扩展其他的存储模块'''

    @abstractmethod
    def search(self, query_text: str, limit: int = 3, sender: Optional[str] = None, owner: Optional[str] = None) -> List[str]:
        '''检索记忆,只返回关联性最强的记忆'''
        pass

    @abstractmethod
    def pageQuery(self, page_num: int, page_size: int, owner: str) -> list[str]:
        '''分页检索记忆'''
        pass

    @abstractmethod
    def save(self, text: str, sender: str, owner: str, importance_score: int = 1) -> bool:
        '''保存记忆'''
        pass

    @abstractmethod
    def clear(self, owner: str) -> bool:
        '''清空记忆'''
        pass
