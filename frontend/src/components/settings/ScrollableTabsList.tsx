import React, { useEffect, useRef, useState } from 'react';
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TabItem {
  value: string;
  label: string;
}

interface ScrollableTabsListProps {
  tabs: TabItem[];
  className?: string;
}

export function ScrollableTabsList({ tabs, className = "" }: ScrollableTabsListProps) {
  const [isClient, setIsClient] = useState(false);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(true);
  const tabsListRef = useRef<HTMLDivElement>(null);

  // 检查是否在客户端
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 监听标签滚动
  useEffect(() => {
    if (!isClient || !tabsListRef.current) return;

    const checkScroll = () => {
      const element = tabsListRef.current;
      if (!element) return;
      
      // 判断是否可以向左滚动（当前滚动位置>0）
      setShowLeftScroll(element.scrollLeft > 5);
      
      // 判断是否可以向右滚动（总宽度 - 当前滚动位置 - 可见宽度 > 5px）
      const canScrollRight = element.scrollWidth - element.scrollLeft - element.clientWidth > 5;
      setShowRightScroll(canScrollRight);
      
      // 如果内容宽度大于容器宽度，但还没开始滚动，强制显示右滚动按钮
      if (element.scrollWidth > element.clientWidth && element.scrollLeft === 0) {
        setShowRightScroll(true);
      }
      
      // 强制显示右键按钮在窄屏幕上
      if (window.innerWidth < 768) {
        setShowRightScroll(true);
      }
    };
    
    // 初始检查
    checkScroll();
    
    // 添加滚动事件监听
    const tabsList = tabsListRef.current;
    tabsList.addEventListener('scroll', checkScroll);
    
    // 窗口大小变化时也检查
    window.addEventListener('resize', checkScroll);
    
    // 确保在较窄屏幕上初始时就显示右滚动按钮 - 多次检测以确保准确性
    setTimeout(checkScroll, 100);
    setTimeout(checkScroll, 500); 
    setTimeout(checkScroll, 1000);
    
    return () => {
      tabsList.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [isClient]);

  // 滚动函数
  const scrollTabsLeft = () => {
    if (tabsListRef.current) {
      tabsListRef.current.scrollBy({ left: -120, behavior: 'smooth' });
    }
  };

  const scrollTabsRight = () => {
    if (tabsListRef.current) {
      tabsListRef.current.scrollBy({ left: 120, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative sticky top-0 z-10 mb-6">
      <div className="flex items-center relative">
        {/* 左滚动渐变区域 */}
        {showLeftScroll && (
          <button
            className="scroll-button scroll-button-left"
            onClick={scrollTabsLeft}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        
        {/* TabsList容器 */}
        <div className="w-full relative">
          <TabsList 
            className={`flex bg-muted/40 overflow-x-auto overflow-y-hidden max-w-full w-full justify-start ${className}`}
            ref={tabsListRef}
          >
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.value}
                value={tab.value} 
                className="text-sm whitespace-nowrap font-medium mx-1 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm flex-shrink-0"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* 右滚动渐变区域 */}
          {showRightScroll && (
            <button
              className="scroll-button scroll-button-right"
              onClick={scrollTabsRight}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 