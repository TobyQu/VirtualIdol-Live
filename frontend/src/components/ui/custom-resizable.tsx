import * as React from "react"
import { 
  Panel as OriginalResizablePanel, 
  PanelGroup as OriginalResizablePanelGroup, 
  PanelResizeHandle as OriginalResizableHandle 
} from "react-resizable-panels"
import { cn } from "@/lib/utils"
import { DragHandleDots2Icon } from "@radix-ui/react-icons"

// 创建一个仅在客户端渲染的组件包装器
function ClientOnly({ children, ...props }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return <>{children}</>;
}

const ResizablePanelGroup = React.forwardRef<
  React.ElementRef<typeof OriginalResizablePanelGroup>,
  React.ComponentPropsWithoutRef<typeof OriginalResizablePanelGroup>
>(({ className, ...props }, ref) => (
  <ClientOnly>
    <OriginalResizablePanelGroup
      ref={ref}
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  </ClientOnly>
))
ResizablePanelGroup.displayName = "ResizablePanelGroup"

const ResizablePanel = React.forwardRef<
  React.ElementRef<typeof OriginalResizablePanel>,
  React.ComponentPropsWithoutRef<typeof OriginalResizablePanel>
>(({ className, ...props }, ref) => (
  <ClientOnly>
    <OriginalResizablePanel
      ref={ref}
      className={cn("relative h-full", className)}
      {...props}
    />
  </ClientOnly>
))
ResizablePanel.displayName = "ResizablePanel"

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof OriginalResizableHandle>,
  React.ComponentPropsWithoutRef<typeof OriginalResizableHandle> & {
    withHandle?: boolean
  }
>(({ className, withHandle = false, ...props }, ref) => (
  <ClientOnly>
    <OriginalResizableHandle
      ref={ref}
      className={cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
          <DragHandleDots2Icon className="h-2.5 w-2.5" />
        </div>
      )}
    </OriginalResizableHandle>
  </ClientOnly>
))
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle } 