from django.db import models


# Create your models here.
class PortalUser(models.Model):
    '''
      门户用户基本信息
    '''
    id = models.BigIntegerField(primary_key=True, db_comment="门户用户唯一ID")
    name = models.CharField(max_length=100, db_comment="门户用户名称")

    def __str__(self):
        return self.id


class CustomRoleModel(models.Model):
    '''统一自定义角色定义数据结构
    role_name: 角色名称
    persona: 角色基本信息定义
    personality: 角色的性格简短描述
    scenario: 角色的对话的情况和背景
    examples_of_dialogue: 角色的对话样例
    custom_role_template_type： 模版类型
    role_package_id：角色安装包id
    '''
    id = models.AutoField
    role_name = models.CharField(max_length=100)
    persona = models.TextField()
    personality = models.TextField()
    scenario = models.TextField()
    examples_of_dialogue = models.TextField()
    custom_role_template_type = models.CharField(max_length=50)
    role_package_id = models.IntegerField()

    def __str__(self):
        return self.role_name


class SysConfigModel(models.Model):
    '''系统配置数据结构
    id: 主键id
    code: 配置code
    config: 配置json
    '''
    id = models.AutoField
    code = models.CharField(max_length=20)
    config = models.TextField()

    def __str__(self):
        return str(self.code)


class LocalMemoryModel(models.Model):
    '''记忆数据存储数据结构
    id: 主键ID
    text: 记忆文本
    sender: 发送者
    owner: 记忆的所有人
    timestamp: 创建时间
    '''
    id = models.AutoField
    text = models.TextField()
    tags = models.TextField()
    sender = models.CharField(max_length=50, default="null")
    owner = models.CharField(max_length=50)
    timestamp = models.DateTimeField()

    def __str__(self):
        return self.id


class BackgroundImageModel(models.Model):
    id = models.AutoField
    original_name = models.CharField(max_length=50)
    image = models.ImageField(upload_to='background/')


class VrmModel(models.Model):
    id = models.AutoField
    type = models.CharField(max_length=10)
    original_name = models.CharField(max_length=50)
    vrm = models.FileField(upload_to='vrm/')


class RolePackageModel(models.Model):
    id = models.AutoField
    role_name = models.CharField(max_length=10)
    dataset_json_path = models.CharField(max_length=10)
    embed_index_idx_path = models.CharField(max_length=10)
    system_prompt_txt_path = models.CharField(max_length=10)
    role_package = models.FileField(upload_to='role_package/')
