import { useRef } from 'react';
import { uploadBackground, queryBackground, uploadVrmModel, queryUserVrmModels, uploadRolePackage } from "@/features/media/mediaApi";

interface FileInputsProps {
  onBackgroundUploaded?: (data: any) => void;
  onVrmModelUploaded?: (data: any) => void;
  onRolePackageUploaded?: (data: any) => void;
}

export function useFileInputs({ 
  onBackgroundUploaded, 
  onVrmModelUploaded, 
  onRolePackageUploaded 
}: FileInputsProps = {}) {
  // 文件输入引用
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);
  const VrmModelFileInputRef = useRef<HTMLInputElement>(null);
  const RolePackagelFileInputRef = useRef<HTMLInputElement>(null);

  // 点击触发文件选择
  const handleClickChangeBgFile = () => {
    backgroundFileInputRef?.current?.click();
  };

  const handleClickOpenVrmFile = () => {
    VrmModelFileInputRef?.current?.click();
  };

  const handleRolePackageButtonClick = () => {
    RolePackagelFileInputRef?.current?.click();
  };

  // 文件变更处理
  const handleBackgroundFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const selectedFile = event.target.files[0];
      if (!selectedFile) {
        return;
      }
      const formData = new FormData();
      formData.append('background', selectedFile);
      uploadBackground(formData)
        .then(() => {
          queryBackground().then(data => {
            if (onBackgroundUploaded) {
              onBackgroundUploaded(data);
            }
          });
        })
        .catch(error => {
          console.error('上传背景图片失败:', error);
        });
    }
  };

  const handleVrmModelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const selectedFile = event.target.files[0];
      if (!selectedFile) {
        return;
      }
      const formData = new FormData();
      formData.append('vrm_model', selectedFile);
      uploadVrmModel(formData)
        .then(() => {
          queryUserVrmModels().then(data => {
            if (onVrmModelUploaded) {
              onVrmModelUploaded(data);
            }
          });
        })
        .catch(error => {
          console.error('上传VRM模型失败:', error);
        });
    }
  };

  const handleRolePackageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const selectedFile = event.target.files[0];
      if (!selectedFile) {
        return;
      }
      const formData = new FormData();
      formData.append('role_package', selectedFile);
      uploadRolePackage(formData)
        .then(() => {
          if (onRolePackageUploaded) {
            onRolePackageUploaded(null);
          }
        })
        .catch(() => {
          console.error('上传角色包失败');
        });
    }
  };

  // 隐藏的文件输入组件
  const FileInputComponents = () => (
    <>
      <input
        type="file"
        ref={backgroundFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleBackgroundFileChange}
      />
      <input
        type="file"
        ref={VrmModelFileInputRef}
        style={{ display: 'none' }}
        accept=".vrm"
        onChange={handleVrmModelFileChange}
      />
      <input
        type="file"
        ref={RolePackagelFileInputRef}
        style={{ display: 'none' }}
        accept=".zip"
        onChange={handleRolePackageFileChange}
      />
    </>
  );

  return {
    // 引用
    backgroundFileInputRef,
    VrmModelFileInputRef,
    RolePackagelFileInputRef,

    // 点击处理函数
    handleClickChangeBgFile,
    handleClickOpenVrmFile,
    handleRolePackageButtonClick,

    // 文件变更处理函数 
    handleBackgroundFileChange,
    handleVrmModelFileChange,
    handleRolePackageFileChange,

    // 组件
    FileInputComponents
  };
} 