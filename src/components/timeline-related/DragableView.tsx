import React, { MouseEventHandler, useEffect, useRef } from "react";

interface DragableViewProps {
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  value: number;
  total: number;
  onChange: (value: number) => void;
  onDrag?: (value: number) => void;
}

function DragableView(props: DragableViewProps) {
  const ref = useRef<{
    div: HTMLDivElement | null;
    isDragging: boolean;
    initialMouseX: number;
  }>({
    div: null,
    isDragging: false,
    initialMouseX: 0,
  });
  
  const { current: data } = ref;

  function calculateNewValue(mouseX: number): number {
    if (!data.div) return 0;
    const deltaX = mouseX - data.initialMouseX;
    const deltaValue = (deltaX / data.div.parentElement!.clientWidth) * props.total;
    return Math.max(0, Math.min(props.total, props.value + deltaValue));
  }

  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!data.div || props.disabled) return;
    data.isDragging = true;
    data.initialMouseX = event.clientX;
    event.stopPropagation();
  };

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!data.div || !data.isDragging) return;
    const newValue = calculateNewValue(event.clientX);
    
    if (props.onDrag) {
      props.onDrag(newValue);
    }
    
    data.div.style.left = `${(newValue / props.total) * 100}%`;
    event.stopPropagation();
    event.preventDefault();
  };

  const handleMouseUp: MouseEventHandler<HTMLDivElement> = (event) => {
    if (!data.div || !data.isDragging) return;
    data.isDragging = false;
    props.onChange(calculateNewValue(event.clientX));
    event.stopPropagation();
    event.preventDefault();
  };

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp as any);
    window.addEventListener("mousemove", handleMouseMove as any);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp as any);
      window.removeEventListener("mousemove", handleMouseMove as any);
    };
  }, [handleMouseUp, handleMouseMove,handleMouseDown]);

  return (
    <div
      ref={(r) => {
        data.div = r;
      }}
      className={`absolute height-100 ${props.className}`}
      style={{
        left: (props.value / props.total) * 100 + "%",
        top: 0,
        bottom: 0,
        ...props.style,
      }}
      onMouseDown={handleMouseDown}
    >
      {props.children}
    </div>
  );
}

export default DragableView;
