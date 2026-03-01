import { useState, useRef, useEffect } from "react";

const MIN_HEIGHT_RATIO = 0.1;
const MAX_HEIGHT_RATIO = 0.3;

export function useTextareaHeight() {
    const [textareaHeight, setTextareaHeight] = useState(() => window.innerHeight * MIN_HEIGHT_RATIO);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dragStartY = useRef(0);
    const dragStartHeight = useRef(0);

    // Sync height with ref
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = `${textareaHeight}px`;
        }
    }, [textareaHeight]);

    // Initialize height
    useEffect(() => {
        const initialHeight = window.innerHeight * MIN_HEIGHT_RATIO;
        setTextareaHeight(initialHeight);
    }, []);

    // Auto-resize on input
    const adjustHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = `${textareaHeight}px`;
            const scrollHeight = textareaRef.current.scrollHeight;
            const minHeight = window.innerHeight * MIN_HEIGHT_RATIO;
            const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
            const newHeight = Math.max(minHeight, Math.min(maxHeight, scrollHeight));

            if (scrollHeight > textareaHeight) {
                setTextareaHeight(newHeight);
            }
        }
    };

    // Drag to resize
    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault();
        dragStartY.current = e.clientY;
        dragStartHeight.current = textareaHeight;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaY = dragStartY.current - e.clientY;
            const minHeight = window.innerHeight * MIN_HEIGHT_RATIO;
            const maxHeight = window.innerHeight * MAX_HEIGHT_RATIO;
            const newHeight = Math.max(minHeight, Math.min(maxHeight, dragStartHeight.current + deltaY));
            setTextareaHeight(newHeight);
        };

        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    // Reset height
    const resetHeight = () => {
        setTextareaHeight(window.innerHeight * MIN_HEIGHT_RATIO);
    };

    return {
        textareaHeight,
        textareaRef,
        adjustHeight,
        handleDragStart,
        resetHeight,
        minHeight: window.innerHeight * MIN_HEIGHT_RATIO,
        maxHeight: window.innerHeight * MAX_HEIGHT_RATIO,
    };
}
