import { toast } from "sonner";

// 成功提示
export function showSuccess(message: string) {
  toast.success(message);
}

// 错误提示
export function showError(message: string) {
  toast.error(message);
}

// 信息提示
export function showInfo(message: string) {
  toast.info(message);
}

// 警告提示
export function showWarning(message: string) {
  toast.warning(message);
}

// 加载中提示
export function showLoading(message: string) {
  return toast.loading(message);
}

// 通用提示替代alert
export function showAlert(message: string) {
  toast(message);
} 