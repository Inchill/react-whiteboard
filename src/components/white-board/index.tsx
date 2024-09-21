import React, { useEffect, useRef } from "react";
import './style.css';
import Tools from "../tools";

// Drawing state
let drawingHistory: string[] = [];
let redoHistory: string[] = [];
let currentStep = 0;
let isDrawing = false;
let brushSize = 5;
let selectedColor = "#000";
let selectedTool = "brush";
let prevMousePoint = { x: 0, y: 0 };
let canvasSnapshot: ImageData;

type Position = {
    x: number;
    y: number;
}

const WhiteBoard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fillColorCheckbox = document.querySelector("#fill-color") as HTMLInputElement;

    useEffect(() => {
        initCanvas();
    }, []);

    const initCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const canvasRect = canvas?.getBoundingClientRect();
        canvas.width = canvasRect.width * dpr;
        canvas.height = canvasRect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    // Reset Canvas
    const resetCanvas = () => {
        initCanvas();
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawingHistory.push(localStorage.getItem("savedDrawing") || canvas.toDataURL());
    };

    const getImageSize = (image: HTMLImageElement) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const canvasRect = canvas.getBoundingClientRect();
        const aspectRatio = image.width / image.height;
        const newWidth = canvasRect.width;
        const newHeight = newWidth / aspectRatio;
        return { newWidth, newHeight };
    };

    const loadLocalstorageDrawing = () => {
        const savedDrawing = localStorage.getItem("savedDrawing");
        if (!savedDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
    
        const image = new Image();
        image.src = savedDrawing;
        image.onload = () => {
            const size = getImageSize(image);
            if (size) {
                const { newWidth, newHeight } = size;
                ctx.drawImage(image, 0, 0, newWidth, newHeight);
            }
        }
    }

    // 保存白板绘画信息
    const saveDrawingToLocalstorage = () => {
        const canvas = canvasRef.current;
        const canvasDrawing = canvas!.toDataURL();
        localStorage.setItem("savedDrawing", canvasDrawing);
    }

    // 保存每一步的数据
    const saveDrawingState = () => {
        const canvas = canvasRef.current;
        if (currentStep < drawingHistory.length - 1) {
            drawingHistory = drawingHistory.slice(0, currentStep + 1);
        }
        currentStep++;
        drawingHistory.push(canvas!.toDataURL());
        redoHistory = [];
        saveDrawingToLocalstorage();
    }

    // 处理撤销和恢复
    const handleUndoRedo = (selectedBtn: HTMLLIElement) => {
        if (selectedBtn.id === "undo" && currentStep > 0) {
            currentStep--;
            redoHistory.push(drawingHistory[currentStep + 1]);
        } else if (selectedBtn.id === "redo" && redoHistory.length > 0) {
            currentStep++;
            const redoItem = redoHistory.pop();
            if (redoItem) {
                drawingHistory.push(redoItem);
            }
        } else {
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas === null || !ctx) return;
    
        const image = new Image();
        image.src = drawingHistory[currentStep];
        image.onload = () => {
            const size = getImageSize(image);
            if (size) {
                const { newWidth, newHeight } = size;
                ctx.drawImage(image, 0, 0, newWidth, newHeight);
                saveDrawingToLocalstorage();
            }
        }
    }

    // 获取当前鼠标/触摸点位置坐标
    const currentMousePoint = (e: TouchEvent | MouseEvent) => {
        const canvas = canvasRef.current;
        let x: number, y: number;
    
        // 判断是否是 TouchEvent
        if (e instanceof TouchEvent) {
            x = e.touches[0].pageX - canvas!.offsetLeft;
            y = e.touches[0].pageY - canvas!.offsetTop;
        } 
        // 否则认为是 MouseEvent
        else if (e instanceof MouseEvent) {
            x = e.pageX - canvas!.offsetLeft;
            y = e.pageY - canvas!.offsetTop;
        } else {
            return { x: 0, y: 0 }; // 如果都不是，返回默认值
        }
    
        return { x, y };
    }

    // 画线
    const drawLine = (position: Position) => {
        const canvas = canvasRef.current as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.beginPath();
        ctx.moveTo(prevMousePoint.x, prevMousePoint.y);
        ctx.lineTo(position.x, position.y);
        ctx.stroke();
    }

    // 绘制矩形
    const drawRectangle = (position: Position) => {
        const canvas = canvasRef.current as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.beginPath();
        const width = position.x - prevMousePoint.x;
        const height = position.y - prevMousePoint.y;
      
        ctx.rect(prevMousePoint.x, prevMousePoint.y, width, height);

        fillColorCheckbox.checked ? ctx.fill() : ctx.stroke();
        ctx.closePath();
    }

    // 绘制圆形
    const drawCircle = (position: Position) => {
        const canvas = canvasRef.current as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.beginPath();
        let radius = Math.sqrt(Math.pow((prevMousePoint.x - position.x), 2) + Math.pow((prevMousePoint.y - position.y), 2));
        ctx.arc(prevMousePoint.x, prevMousePoint.y, radius, 0, 2 * Math.PI);
        fillColorCheckbox.checked ? ctx.fill() : ctx.stroke();
    }

    // 绘制三角形
    const drawTriangle = (position: Position) => {
        const canvas = canvasRef.current as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.beginPath();
        ctx.moveTo(prevMousePoint.x, prevMousePoint.y);
        ctx.lineTo(position.x, position.y);
        ctx.lineTo(prevMousePoint.x * 2 - position.x, position.y);
        ctx.closePath();
        fillColorCheckbox.checked ? ctx.fill() : ctx.stroke();
    }

    // 开始绘制
    const drawStart = (e: TouchEvent | MouseEvent) => {
        e.preventDefault();
        isDrawing = true;
        const canvas = canvasRef.current as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.beginPath();
        ctx.lineCap = "round";
        prevMousePoint = currentMousePoint(e);
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = selectedColor;
        ctx.fillStyle = selectedColor;
        canvasSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    // 绘制中
    const drawing = (e: TouchEvent | MouseEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        let position = currentMousePoint(e);
        const canvas = canvasRef.current as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(canvasSnapshot, 0, 0);
      
        if (selectedTool === "brush" || selectedTool === "eraser") {
          ctx.strokeStyle = selectedTool === "eraser" ? "#fff" : selectedColor;
          ctx.lineTo(position.x, position.y);
          ctx.stroke();
        } else if (selectedTool === "line") {
          drawLine(position);
        } else if (selectedTool === "rect") {
          drawRectangle(position);
        } else if (selectedTool === "circle") {
          drawCircle(position);
        } else {
          drawTriangle(position);
        }
        ctx.stroke();
    }

    // 绘制中
    const drawStop = () => {
        if (!isDrawing) return;
        isDrawing = false;
        saveDrawingState();
    }

    return (
        <div className="white-board">
            <section className="tools-board">
                <Tools />
            </section>
            <section className="drawing-board">
                <canvas ref={canvasRef}></canvas>
            </section>
        </div>
    )
}

export default WhiteBoard;
