import { Button } from "@/components/ui/button"
import { ExternalLink, Maximize2 } from "lucide-react"
import { useState, useEffect } from "react"

interface DetachButtonProps {
  onDetach: () => void
  isDetached: boolean
}

export function DetachButton({ onDetach, isDetached }: DetachButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDetach}
      title={isDetached ? "重新融合聊天窗口" : "分离聊天窗口到新窗口"}
      className="h-8 w-8"
    >
      {isDetached ? (
        <Maximize2 className="h-4 w-4" />
      ) : (
        <ExternalLink className="h-4 w-4" />
      )}
    </Button>
  )
} 