        # 查询长期记忆
        long_memory = self.memory_storage.search_lang_memory(
            prompt=query_text,
            you_name=you_name,
            role_name=role_name
        )