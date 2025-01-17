import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { TOOLS } from './config';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css';

const Tools = forwardRef((props, ref) => {
    const toolRefs = useRef<(HTMLLIElement | null)[]>([]);

    useImperativeHandle(ref, () => ({
        toolOptions: toolRefs.current
    }));

    return (
        <>
            <div className="all-tools shapes-tool">
                <div className="row">
                    <label className="title">形状</label>
                    <ul className="options">
                        {
                            TOOLS.map((tool, index) => (
                                <li
                                    className="option tool"
                                    key={index} id={tool.value}
                                    ref={(el) => (toolRefs.current[index] = el)}
                                >
                                    <i className={tool.iconClass}></i>
                                    <span className="name">{tool.name}</span>
                                </li>
                            ))
                        }
                        <li className="option">
                            <input type="checkbox" id="fill-color" defaultChecked={false} />
                            <label htmlFor="fill-color">填充色</label>
                        </li>
                    </ul>
                </div>
                <div className="row options-tool">
                    <label className="title">Options</label>
                    <ul className="options">
                        <li className="option tool active" id="brush">
                            <i className="bi bi-brush"></i>
                            <span className="name">画笔</span>
                        </li>
                        <li className="option tool" id="eraser">
                            <i className="bi bi-eraser"></i>
                            <span className="name">橡皮擦</span>
                        </li>
                        <li className="option">
                            <input type="range" id="brush-size-slider" min="1" max="100" defaultValue={'10'} />
                        </li>
                    </ul>
                </div>
                <div className="joined-tools">
                    <div className="row colors-tool">
                        <label className="title">颜色</label>
                        <ul className="options colors">
                            <li className="option"></li>
                            <li className="option selected"></li>
                            <li className="option"></li>
                            <li className="option"></li>
                            <li className="option">
                                <input type="color" id="color-picker" defaultValue="#000000" />
                            </li>
                        </ul>
                    </div>
                    <div className="row actions-tool">
                        <label className="title">操作</label>
                        <ul className="options">
                            <li className="option" id="undo">
                                <i className="bi bi-arrow-counterclockwise"></i>
                                <span className="name">撤销</span>
                            </li>
                            <li className="option" id="redo">
                                <i className="bi bi-arrow-clockwise"></i>
                                <span className="name">恢复</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="row buttons">
                <button className="clear-canvas">
                    <i className="bi bi-trash"></i>
                    <span className="name">清除画布</span>
                </button>
                <button className="save-img">
                    <i className="bi bi-download"></i>
                    <span className="name">保存为图片</span>
                </button>
            </div>
        </>
    );
});

Tools.displayName = 'Tools';

export default Tools;
