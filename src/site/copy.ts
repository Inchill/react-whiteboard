import type { Locale } from '../whiteboard/types';

export type SiteCopy = {
    nav: { use: string; features: string; api: string };
    title: string;
    lede: string;
    openBoard: string;
    github: string;
    caption: string;
    reset: string;
    useTitle: string;
    useLede: string;
    steps: { title: string; body: string }[];
    copy: string;
    copied: string;
    featuresTitle: string;
    features: { title: string; body: string }[];
    apiTitle: string;
    apiLede: string;
    propsHeading: string;
    handleHeading: string;
    col: { name: string; type: string; desc: string };
    props: [string, string, string][];
    handle: [string, string][];
    footer: string;
    badges: string[];
    noteTools: string;
    noteDraw: string;
    endTitle: string;
    endBody: string;
    themeToggle: string;
    langToggle: string;
};

const en: SiteCopy = {
    nav: { use: 'Get started', features: 'Features', api: 'API' },
    title: 'A whiteboard you can drop into any React app.',
    lede: 'Infinite canvas, shapes, text, selection, undo and export to PNG or SVG. One component, about 23 kB gzipped, with no dependencies beyond React.',
    openBoard: 'Open the full board',
    github: 'View on GitHub',
    caption: 'That is the real component, not a screenshot. Draw on it.',
    reset: 'Reset demo',
    useTitle: 'Get started',
    useLede: 'Give the board a parent with a height and you are done. Drawings autosave to localStorage by default.',
    steps: [
        { title: 'Install', body: 'Add the package with pnpm (npm and yarn work too).' },
        { title: 'Import the styles', body: 'Load the stylesheet once, anywhere in your app.' },
        { title: 'Render it', body: 'The board fills its parent, so give the parent a size.' },
    ],
    copy: 'Copy',
    copied: 'Copied',
    featuresTitle: 'What it does',
    features: [
        { title: 'Eleven tools', body: 'Select, pan, pen, highlighter, eraser, line, arrow, rectangle, ellipse, triangle and text.' },
        { title: 'Vector, not pixels', body: 'Every stroke is a shape you can select, move, restyle, reorder or delete. Resizing the window never loses work.' },
        { title: 'Infinite canvas', body: 'Pan with the hand tool, Space or the trackpad; zoom with Ctrl + wheel or a two-finger pinch.' },
        { title: 'Rub-out eraser', body: 'Erase just the part of a stroke you rub over, or switch to removing whole shapes. Every swipe is one undo step.' },
        { title: 'Export anywhere', body: 'PNG, SVG and a JSON file you can open again later. Copy a PNG straight to the clipboard.' },
        { title: 'Keyboard first', body: 'Single-key tool shortcuts, Shift to constrain angles and squares, arrow keys to nudge.' },
        { title: 'Feels like a pen', body: 'Strokes follow Apple Pencil and tablet pressure, or drawing speed with a mouse, and taper at both ends.' },
        { title: 'Light, dark, 中文', body: 'Built-in dark theme and English / Chinese UI, both controllable from props.' },
    ],
    apiTitle: 'API',
    apiLede: 'Everything is optional. Use a ref when you need to read or replace the drawing from outside.',
    propsHeading: 'Props',
    handleHeading: 'Ref methods',
    col: { name: 'Name', type: 'Type', desc: 'Description' },
    props: [
        ['storageKey', 'string | null', 'localStorage key for autosave. Default "react-whiteboard"; null turns it off.'],
        ['initialShapes', 'Shape[]', 'Shapes to start with when nothing is saved.'],
        ['theme', '"light" | "dark"', 'Controls the theme. Leave unset to let users toggle it.'],
        ['locale', '"en" | "zh"', 'Controls the UI language. Detected from the browser when unset.'],
        ['initialTool', 'Tool', 'Tool selected on mount. Default "pen".'],
        ['tools', 'Tool[]', 'Tools shown in the toolbar, in order. For example ["pen", "highlighter", "eraser"] for a doodle pad.'],
        ['onChange', '(shapes) => void', 'Called after each committed change.'],
        ['globalShortcuts', 'boolean', 'Listen for shortcuts on window. Default true; set false when embedding.'],
        ['captureWheel', 'boolean', 'Plain wheel pans the canvas. Set false inside scrolling pages.'],
        ['showMenu', 'boolean', 'Show the main menu with file, export and settings. Default true.'],
    ],
    handle: [
        ['getShapes()', 'Current shapes.'],
        ['setShapes(shapes, { history })', 'Replace the drawing, as an undo step unless history is false.'],
        ['undo() / redo() / clear()', 'Same as the toolbar buttons.'],
        ['exportPng(options)', 'Resolves to a PNG Blob.'],
        ['exportSvg(options)', 'Returns an SVG string.'],
        ['exportJson()', 'Returns the JSON that the Open menu item reads back.'],
        ['zoomToFit()', 'Fit all content in view.'],
    ],
    footer: 'MIT licensed. Made by Inchill and contributors.',
    badges: ['MIT licensed', '~23 kB gzipped', 'React 18 & 19', 'TypeScript'],
    noteTools: 'pick a tool',
    noteDraw: 'scribble anywhere!',
    endTitle: 'Your turn.',
    endBody: 'Open a blank board in your browser. Nothing to install, and your drawing stays on your device.',
    themeToggle: 'Toggle dark mode',
    langToggle: '中文',
};

const zh: SiteCopy = {
    nav: { use: '快速开始', features: '功能', api: 'API' },
    title: '一块白板，\n放进任何 React 应用。',
    lede: '无限画布、图形、文字、选择移动、撤销重做，还能导出 PNG 和 SVG。只有一个组件，gzip 后约 23 kB，除了 React 没有其他依赖。',
    openBoard: '打开完整白板',
    github: '在 GitHub 查看',
    caption: '上面就是组件本身，不是截图，可以直接画。',
    reset: '重置示例',
    useTitle: '快速开始',
    useLede: '给白板一个有高度的父元素就能用。画的内容默认自动保存在 localStorage。',
    steps: [
        { title: '安装', body: '用 pnpm 安装（npm、yarn 也可以）。' },
        { title: '引入样式', body: '在应用里任意位置引入一次样式表。' },
        { title: '渲染组件', body: '白板会撑满父元素，所以父元素要有尺寸。' },
    ],
    copy: '复制',
    copied: '已复制',
    featuresTitle: '能做什么',
    features: [
        { title: '11 种工具', body: '选择、抓手、画笔、荧光笔、橡皮擦、直线、箭头、矩形、椭圆、三角形和文字。' },
        { title: '矢量，而非像素', body: '每一笔都是可以选中、移动、改样式、调层级、删除的图形，调整窗口大小也不会丢内容。' },
        { title: '无限画布', body: '用抓手、空格或触控板平移；Ctrl + 滚轮或双指捏合缩放。' },
        { title: '局部擦除', body: '只擦掉划过的那一段笔画，也能切换成整笔删除。每擦一下都能单独撤销。' },
        { title: '多种导出', body: '导出 PNG、SVG，或保存成 JSON 以后再打开，也能一键复制 PNG 到剪贴板。' },
        { title: '键盘优先', body: '单键切换工具，按住 Shift 锁定角度和正方形，方向键微调位置。' },
        { title: '像真笔一样', body: '线条粗细跟随 Apple Pencil、数位板的压力，用鼠标时随书写速度变化，起笔收笔自然变尖。' },
        { title: '深色模式与中英文', body: '内置深色主题和中英文界面，也可以通过 props 控制。' },
    ],
    apiTitle: 'API',
    apiLede: '所有参数都是可选的。需要从外部读取或替换画板内容时，用 ref。',
    propsHeading: 'Props',
    handleHeading: 'Ref 方法',
    col: { name: '名称', type: '类型', desc: '说明' },
    props: [
        ['storageKey', 'string | null', '自动保存用的 localStorage key，默认 "react-whiteboard"，传 null 关闭。'],
        ['initialShapes', 'Shape[]', '没有已保存内容时的初始图形。'],
        ['theme', '"light" | "dark"', '受控主题。不传则由用户在菜单中切换。'],
        ['locale', '"en" | "zh"', '受控界面语言。不传则根据浏览器自动判断。'],
        ['initialTool', 'Tool', '初始工具，默认 "pen"。'],
        ['tools', 'Tool[]', '工具栏显示的工具及顺序，例如 ["pen", "highlighter", "eraser"] 就是一个涂鸦板。'],
        ['onChange', '(shapes) => void', '每次提交修改后调用。'],
        ['globalShortcuts', 'boolean', '在 window 上监听快捷键，默认 true；嵌入页面时建议 false。'],
        ['captureWheel', 'boolean', '普通滚轮用于平移画布。放在可滚动页面里时设为 false。'],
        ['showMenu', 'boolean', '是否显示主菜单（文件、导出、设置），默认 true。'],
    ],
    handle: [
        ['getShapes()', '获取当前所有图形。'],
        ['setShapes(shapes, { history })', '替换画板内容；除非 history 为 false，否则可撤销。'],
        ['undo() / redo() / clear()', '与工具栏按钮相同。'],
        ['exportPng(options)', '返回 PNG Blob 的 Promise。'],
        ['exportSvg(options)', '返回 SVG 字符串。'],
        ['exportJson()', '返回 JSON，可通过菜单里的“打开”重新载入。'],
        ['zoomToFit()', '缩放到能看到全部内容。'],
    ],
    footer: '基于 MIT 协议开源。由 Inchill 和贡献者维护。',
    badges: ['MIT 开源', 'gzip 约 23 kB', '支持 React 18 / 19', 'TypeScript'],
    noteTools: '选个工具',
    noteDraw: '随便画画！',
    endTitle: '轮到你了。',
    endBody: '在浏览器里打开一块空白画板。不用安装，画的内容只保存在你自己的设备上。',
    themeToggle: '切换深色模式',
    langToggle: 'English',
};

export const SITE_COPY: Record<Locale, SiteCopy> = { en, zh };
