import React from 'react';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './style.css'

const Tools = () => {
    return (
        <section className="tools-board">
            <div className="all-tools shapes-tool">
                <div className="row">
                    <label className="title">形状</label>
                    <ul className="options">
                        <li className="option tool" id="line">
                            <i className="bi bi-slash-lg"></i>
                            <span className="name">直线</span>
                        </li>
                        <li className="option tool" id="rect">
                            <i className="bi bi-square"></i>
                            <span className="name">矩形</span>
                        </li>
                        <li className="option tool" id="circle">
                            <i className="bi bi-circle"></i>
                            <span className="name">圆形</span>
                        </li>
                        <li className="option tool" id="triangle">
                            <i className="bi bi-triangle"></i>
                            <span className="name">三角形</span>
                        </li>
                        <li className="option">
                            <input type="checkbox" id="fill-color" />
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
                            <input type="range" id="brush-size-slider" min="1" max="100" value="5" />
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
                                <input type="color" id="color-picker" />
                            </li>
                        </ul>
                    </div>
                    <div className="row actions-tool">
                        <label className="title">操作</label>
                        <ul className="options">
                            <li className="option" id="undo">
                                {/* <span className="icon material-symbols-rounded">undo</span> */}
                                <span className="name">撤销</span>
                            </li>
                            <li className="option" id="redo">
                                {/* <span className="icon material-symbols-rounded">redo</span> */}
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
        </section>
    )
}

export default Tools;